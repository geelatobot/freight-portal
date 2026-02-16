# 货代客户门户 - 任务管理系统
# 自动跟踪任务完成情况

import json
import os
from datetime import datetime

TASK_FILE = "/root/.openclaw/workspace/projects/freight-portal/tasks.json"

def load_tasks():
    if os.path.exists(TASK_FILE):
        with open(TASK_FILE, 'r') as f:
            return json.load(f)
    return {
        "version": "1.0",
        "created_at": datetime.now().isoformat(),
        "tasks": [],
        "completed_count": 0,
        "total_count": 0,
        "status": "running"
    }

def save_tasks(data):
    with open(TASK_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def add_task(task_id, description, category, priority="P1"):
    tasks = load_tasks()
    tasks["tasks"].append({
        "id": task_id,
        "description": description,
        "category": category,
        "priority": priority,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "completed_at": None
    })
    tasks["total_count"] = len(tasks["tasks"])
    save_tasks(tasks)
    return True

def complete_task(task_id):
    tasks = load_tasks()
    for task in tasks["tasks"]:
        if task["id"] == task_id and task["status"] != "completed":
            task["status"] = "completed"
            task["completed_at"] = datetime.now().isoformat()
            tasks["completed_count"] += 1
            save_tasks(tasks)
            return True
    return False

def get_progress():
    tasks = load_tasks()
    total = tasks["total_count"]
    completed = tasks["completed_count"]
    percentage = (completed / total * 100) if total > 0 else 0
    return {
        "total": total,
        "completed": completed,
        "percentage": round(percentage, 2),
        "remaining": total - completed,
        "is_complete": completed >= total and total > 0
    }

def get_pending_tasks():
    tasks = load_tasks()
    return [t for t in tasks["tasks"] if t["status"] == "pending"]

def print_status():
    progress = get_progress()
    pending = get_pending_tasks()
    
    print(f"\n{'='*60}")
    print(f"任务进度: {progress['completed']}/{progress['total']} ({progress['percentage']}%)")
    print(f"剩余任务: {progress['remaining']}")
    print(f"{'='*60}")
    
    if pending:
        print("\n待完成任务:")
        for task in pending:
            print(f"  [{task['priority']}] {task['id']}: {task['description']}")
    else:
        print("\n✅ 所有任务已完成！")
    
    return progress['is_complete']

if __name__ == "__main__":
    print_status()
