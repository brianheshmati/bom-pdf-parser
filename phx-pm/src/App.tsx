import { useState, useMemo } from "react";
import { Gantt, Willow, IColumnConfig } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { generateMockData, GanttTask, GanttLink } from "./mockData";

export default function App() {
  const initial = useMemo(generateMockData, []);
  const [tasks, setTasks] = useState<GanttTask[]>(initial.tasks);
  const [links, setLinks] = useState<GanttLink[]>(initial.links);

  const [managerFilter, setManagerFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);

  const managers = Array.from(new Set(tasks.map((t) => t.manager).filter(Boolean)));
  const locations = Array.from(new Set(tasks.map((t) => t.location).filter(Boolean)));

  const filteredTasks = tasks.filter((t) => {
    const byMgr = managerFilter === "All" || t.manager === managerFilter;
    const byLoc = locationFilter === "All" || t.location === locationFilter;
    return byMgr && byLoc;
  });

  const filteredLinks = links.filter(
    (l) =>
      filteredTasks.some((t) => t.id === l.source) &&
      filteredTasks.some((t) => t.id === l.target)
  );

  const columns: IColumnConfig[] = [
    { id: "text", header: "Task / Phase / Project", width: 240 },
    { id: "manager", header: "Manager", width: 120 },
    { id: "location", header: "Location", width: 120 },
    {
      id: "start",
      header: "Start",
      width: 100,
      align: "center",
      template: (value: any) =>
        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    },
    {
      id: "end",
      header: "End",
      width: 100,
      align: "center",
      template: (value: any) =>
        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    },
    {
      id: "progress",
      header: "% Done",
      width: 80,
      align: "center",
      template: (value: any) => `${value ?? 0}%`,
    },
  ];

  const scales = [
    { unit: "month", step: 1, format: "MMM yyyy" },
    { unit: "week", step: 1, format: "'W'ww" },
    { unit: "day", step: 1, format: "d" },
  ];

  // Handle user actions (move, resize, etc.)
  const handleAction = (ev: any) => {
    const { action, data } = ev;
    if (action === "update") {
      setTasks((prev) => prev.map((t) => (t.id === data.id ? { ...t, ...data } : t)));
    } else if (action === "add") {
      setTasks((prev) => [...prev, data]);
    } else if (action === "remove") {
      setTasks((prev) => prev.filter((t) => t.id !== data.id));
      setLinks((prev) =>
        prev.filter((l) => l.source !== data.id && l.target !== data.id)
      );
    } else if (action === "dblclick") {
      const clicked = tasks.find((t) => t.id === data.id);
      if (clicked) setEditingTask(clicked);
    }
  };

  // Save changes from modal
  const handleSaveEdit = () => {
    if (!editingTask) return;
    setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? editingTask : t)));
    setEditingTask(null);
  };

  return (
    <Willow>
      {/* Filters */}
      <div
        style={{
          padding: "12px",
          background: "#fafafa",
          borderBottom: "1px solid #ddd",
        }}
      >
        <h2 style={{ margin: 0 }}>Tank Fabrication & Installation Projects</h2>
        <div style={{ display: "flex", gap: "1rem", marginTop: "8px" }}>
          <div>
            <label style={{ fontWeight: 500 }}>Manager: </label>
            <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
              <option value="All">All</option>
              {managers.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 500 }}>Location: </label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="All">All</option>
              {locations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: "10px",
          background: "#f3f3f3",
        }}
      >
        <button
          onClick={() =>
            setTasks((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                text: "New Task",
                start: new Date(),
                end: new Date(Date.now() + 3 * 86400000),
                progress: 0,
                type: "task",
              },
            ])
          }
        >
          ➕ Add Task
        </button>
      </div>

      {/* Gantt */}
      <div style={{ height: "calc(100vh - 140px)", width: "100%" }}>
        <Gantt
          tasks={filteredTasks}
          links={filteredLinks}
          columns={columns}
          scales={scales}
          onaction={handleAction}
          ontaskdblclick={(ev: any) => {
            const clicked = tasks.find(t => t.id === ev.data?.id);
            if (clicked) setEditingTask(clicked);
          }}
        />
      </div>

      {/* ✅ Edit Modal */}
      {editingTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setEditingTask(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "360px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Edit Task</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label>
                Task Name:
                <input
                  type="text"
                  value={editingTask.text}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, text: e.target.value })
                  }
                />
              </label>
              <label>
                Start Date:
                <input
                  type="date"
                  value={new Date(editingTask.start).toISOString().split("T")[0]}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      start: new Date(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                End Date:
                <input
                  type="date"
                  value={new Date(editingTask.end).toISOString().split("T")[0]}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      end: new Date(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Progress:
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editingTask.progress ?? 0}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      progress: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label>
                Manager:
                <select
                  value={editingTask.manager ?? ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, manager: e.target.value })
                  }
                >
                  <option value="">--</option>
                  {managers.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Location:
                <select
                  value={editingTask.location ?? ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, location: e.target.value })
                  }
                >
                  <option value="">--</option>
                  {locations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button onClick={() => setEditingTask(null)} style={{ marginRight: "8px" }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </Willow>
  );
}
