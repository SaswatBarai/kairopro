import httpx
from typing import List, Dict, Any

class PlatformClient:
    """Calls Next.js API routes to perform sandbox operations and save state."""

    def __init__(self, base_url: str, service_token: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {service_token}"}
        
    async def _post(self, path: str, json_data: dict) -> httpx.Response:
        async with httpx.AsyncClient() as client:
            return await client.post(f"{self.base_url}{path}", json=json_data, headers=self.headers, timeout=60.0)
            
    async def _put(self, path: str, json_data: dict) -> httpx.Response:
        async with httpx.AsyncClient() as client:
            return await client.put(f"{self.base_url}{path}", json=json_data, headers=self.headers, timeout=60.0)

    async def write_files(self, project_id: str, files: List[Dict[str, str]]) -> None:
        """Writes files to sandbox volume via Next.js API."""
        for file in files:
            res = await self._put(f"/api/projects/{project_id}/workspace/files", {
                "path": file.get("path") or file.get("filePath"),
                "content": file.get("content") or file.get("contentAfter")
            })
            res.raise_for_status()

    async def exec_command(self, project_id: str, command: List[str]) -> Dict[str, Any]:
        """Runs command in sandbox via API and collects full output."""
        res = await self._post(f"/api/projects/{project_id}/sandbox/exec", {"command": command})
        res.raise_for_status()
        
        # The endpoint streams SSE, so we must parse it to get final stdout/stderr
        # For simplicity in testing/debugging logic, we will assume Next.js API handles command fully
        # However, since the Next.js route is streaming, we collect all data chunks here:
        stdout = ""
        stderr = ""
        exit_code = 0
        
        lines = res.text.split("\n\n")
        for line in lines:
            if line.startswith("data: "):
                try:
                    import json
                    payload = json.loads(line[6:])
                    if payload["type"] == "stdout":
                        stdout += payload["data"]
                    elif payload["type"] == "stderr":
                        stderr += payload["data"]
                        if "ERR" in payload["data"] or "failed" in payload["data"]:
                            exit_code = 1
                    elif payload["type"] == "error":
                        stderr += payload["data"]
                        exit_code = 1
                except Exception:
                    pass

        return {"stdout": stdout, "stderr": stderr, "exit_code": exit_code}

    async def store_tasks(self, project_id: str, tasks: List[Dict[str, Any]]) -> None:
        """Bulk creates planned tasks in the DB."""
        res = await self._post(f"/api/projects/{project_id}/tasks/batch", {"tasks": tasks})
        res.raise_for_status()
        
    async def create_change_set(self, project_id: str, task_id: str, files: List[Dict[str, Any]]) -> str:
        """Creates a ChangeSet record with FileChanges."""
        res = await self._post(f"/api/projects/{project_id}/change-sets", {
            "taskId": task_id,
            "description": f"Automated AI changes for task {task_id}",
            "fileChanges": files
        })
        res.raise_for_status()
        data = res.json()
        return data["changeSet"]["id"]
