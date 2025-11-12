import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";

export interface GanttTask {
  id: string;
  text: string;
  start: Date;
  end: Date;
  type: "task" | "summary";
  parent?: string;
  progress?: number;
  manager?: string;
  location?: string;
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: "e2e" | "s2s" | "s2e" | "e2s";
}

const PROJECT_NAMES = [
  "BGST-120k Caldwell Tank, TX",
  "Welded Steel Tank #A13—Mesa, AZ",
  "Potable Water Tank—Fresno, CA",
  "Fire Protection Tank—Reno, NV",
  "Industrial Process Tank—Topeka, KS",
  "Reservoir Retrofit—Salem, OR",
  "Elevated Standpipe—Omaha, NE",
  "Desal Feed Tank—Carlsbad, CA",
  "Brine Storage—Lubbock, TX",
  "Irrigation Tank—Yuma, AZ",
  "Wastewater EQ Tank—Boise, ID",
  "Food-Grade Tank—Modesto, CA",
  "Mining Slurry Tank—Elko, NV",
  "Brewery CIP Tank—San Diego, CA",
  "RO Permeate Tank—Las Vegas, NV",
  "Thermal Energy Tank—Sacramento, CA",
  "Rainwater Harvest—Santa Rosa, CA",
  "Storm Surge Tank—Houston, TX",
  "Greywater Tank—Anaheim, CA",
  "Chemical Dosing Tank—Long Beach, CA",
];

const PHASES = [
  "Engineering & Submittals",
  "Plate Cutting & Forming",
  "Shell & Floor Fabrication",
  "Surface Prep & Coatings",
  "Delivery & Site Mobilization",
  "Erection & Installation",
  "Hydrotest & Commissioning",
];

const TASKS: Record<string, string[]> = {
  "Engineering & Submittals": [
    "IFC Drawings",
    "PE Stamp & Calcs",
    "Anchor Bolt Plan",
    "Submittal Package",
    "Owner Review / Approval",
  ],
  "Plate Cutting & Forming": [
    "Material Receipt",
    "Plate Nesting & CNC",
    "Shell Plate Rolling",
    "Nozzle Cutouts",
    "QC Dimensional Check",
  ],
  "Shell & Floor Fabrication": [
    "Floor Layout & Weld",
    "Shell Seam Welds",
    "Stiffener Fit-Up",
    "Manway Assembly",
    "NDE / Visual Inspection",
  ],
  "Surface Prep & Coatings": [
    "Abrasive Blast SSPC-SP10",
    "Interior Linings",
    "Exterior Prime",
    "Final Topcoat",
  ],
  "Delivery & Site Mobilization": [
    "Trucking Permits",
    "Load-Out",
    "Site Setup",
    "Crane Scheduling",
    "Safety Plan & JHA",
  ],
  "Erection & Installation": [
    "Floor Plates Install",
    "Shell Rings Erection",
    "Roof Plates",
    "Ladders & Handrails",
  ],
  "Hydrotest & Commissioning": [
    "Filling & Soak",
    "Leak Repairs (if any)",
    "Disinfection",
    "Turnover & Punchlist",
  ],
};

const MANAGERS = ["Jeremy", "Jessica", "Marlon", "Toni", "Brian"];

export function generateMockData() {
  const tasks: GanttTask[] = [];
  const links: GanttLink[] = [];
  const today = dayjs();

  PROJECT_NAMES.slice(0, 20).forEach((proj) => {
    const projectId = uuidv4();
    const start = today.add(Math.floor(Math.random() * 20) - 5, "day").toDate();
    const end = dayjs(start).add(90 + Math.random() * 40, "day").toDate();
    const location = proj.split("—").pop()?.trim() || "USA";

    // Project (summary)
    tasks.push({
      id: projectId,
      text: proj,
      start,
      end,
      type: "summary",
      progress: Math.floor(Math.random() * 60),
      manager: MANAGERS[Math.floor(Math.random() * MANAGERS.length)],
      location,
    });

    // Add 3–5 phases per project
    const phaseCount = 3 + Math.floor(Math.random() * 3);
    const chosenPhases = PHASES.slice(0, phaseCount);
    let prevPhaseEnd = dayjs(start);

    chosenPhases.forEach((phaseName) => {
      const phaseId = uuidv4();
      const phStart = prevPhaseEnd.add(Math.random() * 3, "day");
      const phEnd = phStart.add(10 + Math.random() * 25, "day");
      prevPhaseEnd = phEnd;

      // Phase (summary)
      tasks.push({
        id: phaseId,
        text: phaseName,
        start: phStart.toDate(),
        end: phEnd.toDate(),
        type: "summary",
        parent: projectId,
        progress: Math.floor(Math.random() * 80),
        manager: MANAGERS[Math.floor(Math.random() * MANAGERS.length)],
        location,
      });

      const subTasks = TASKS[phaseName] || [];
      let prevTaskId: string | null = null;
      let tStart = phStart;

      subTasks.slice(0, 3 + Math.floor(Math.random() * 4)).forEach((t) => {
        const tid = uuidv4();
        const dur = 2 + Math.floor(Math.random() * 6);
        const tEnd = tStart.add(dur, "day");

        tasks.push({
          id: tid,
          text: t,
          start: tStart.toDate(),
          end: tEnd.toDate(),
          type: "task",
          parent: phaseId,
          progress: Math.floor(Math.random() * 100),
          manager: MANAGERS[Math.floor(Math.random() * MANAGERS.length)],
          location,
        });

        if (prevTaskId) {
          links.push({
            id: uuidv4(),
            source: prevTaskId,
            target: tid,
            type: "e2s",
          });
        }

        prevTaskId = tid;
        tStart = tEnd.add(Math.random() * 2, "day");
      });
    });
  });

  return { tasks, links };
}
