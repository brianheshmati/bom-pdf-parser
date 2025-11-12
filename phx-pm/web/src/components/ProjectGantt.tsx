import * as React from 'react';
import { GanttComponent, Inject, Selection, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-gantt';
import { projectNewData } from '../data/projectNewData';

const ProjectGantt: React.FC = () => {
  let ganttInstance: GanttComponent;

  const taskFields: any = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    child: 'subtasks',  // <-- Critical for proper nested view
  };

  const labelSettings: any = { leftLabel: 'TaskName' };
  const splitterSettings: any = { columnIndex: 2 };
  const projectStartDate: Date = new Date('2025-01-01');
  const projectEndDate: Date = new Date('2025-12-31');

  const onCreated = (): void => {
    if (document.querySelector('.e-bigger')) {
      ganttInstance.rowHeight = 48;
      ganttInstance.taskbarHeight = 28;
    }
  };

  return (
    <div className="control-pane" style={{ padding: 20 }}>
      <div className="control-section">
        <GanttComponent
          id="ProjectGantt"
          ref={(gantt) => (ganttInstance = gantt!)}
          dataSource={projectNewData}
          treeColumnIndex={1}
          taskFields={taskFields}
          splitterSettings={splitterSettings}
          labelSettings={labelSettings}
          height="700px"
          taskbarHeight={25}
          rowHeight={46}
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          created={onCreated}
        >
          <ColumnsDirective>
            <ColumnDirective field="TaskID" headerText="ID" width="80" />
            <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
            <ColumnDirective field="StartDate" headerText="Start Date" />
            <ColumnDirective field="Duration" headerText="Duration (days)" />
            <ColumnDirective field="Progress" headerText="Progress (%)" />
          </ColumnsDirective>
          <Inject services={[Selection]} />
        </GanttComponent>
      </div>
    </div>
  );
};

export default ProjectGantt;
