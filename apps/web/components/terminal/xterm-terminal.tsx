"use client";

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export function XtermTerminal({ projectId }: { projectId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Xterm
    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#e2e8f0',
        cursor: '#4f46e5',
        selectionBackground: 'rgba(79, 70, 229, 0.3)',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[35m[KairoPro Workspace]\x1b[0m Starting interactive shell...');

    // Implement a simple interactive shell via polling/streaming for this demo.
    // Real WS implementation is best for interactive TTY, but here we simulate a prompt.
    let currentInput = "";
    
    term.write('\r\n$ ');

    term.onData(async (e) => {
      switch (e) {
        case '\r': // Enter
          term.write('\r\n');
          const cmd = currentInput.trim();
          currentInput = "";
          
          if (cmd) {
            term.write('\x1b[90mRunning: ' + cmd + '\x1b[0m\r\n');
            await executeCommand(cmd);
          }
          term.write('\r\n$ ');
          break;
        case '\u007F': // Backspace
          if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            term.write('\b \b');
          }
          break;
        default:
          // Print all other characters
          if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
            currentInput += e;
            term.write(e);
          }
      }
    });

    const executeCommand = async (cmd: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/sandbox/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: ['sh', '-c', cmd] })
        });
        
        if (!res.body) return;
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n').filter(Boolean);
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const { type, data } = JSON.parse(line.slice(6));
                if (data) {
                    const formatted = data.replace(/\n/g, '\r\n');
                    if (type === 'error') term.write(`\x1b[31m${formatted}\x1b[0m`);
                    else term.write(formatted);
                }
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        term.write(`\x1b[31mCommand execution failed\x1b[0m\r\n`);
      }
    };

    const handleResize = () => {
      if (fitAddonRef.current) fitAddonRef.current.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [projectId]);

  return <div ref={terminalRef} className="w-full h-full p-2" />;
}
