import React, { Component } from 'react';
import { render } from 'react-testing-library';
import { collect, store } from '../lib';

const Task = props => (
  <div>{props.task.name}</div>
);

class RawTaskList extends Component {
  render () {
    return (
      <div>
        <button onClick={() => {
          if (!store.tasks) store.tasks = [];

          store.tasks.push({
            id: Math.random(),
            name: `Task number ${store.tasks.length + 1}`,
          });
        }}>
          Add task
        </button>

        <button onClick={() => {
          store.tasks.pop();
        }}>
          Remove last task
        </button>

        <button onClick={() => {
          delete store.tasks;
        }}>
          Remove all tasks
        </button>

        {!!store.tasks && !!store.tasks.length && (
          <React.Fragment>
            <h1>Task list</h1>

            {store.tasks.map(task => (
              <Task task={task} key={task.id} />
            ))}
          </React.Fragment>
        )}
      </div>
    );
  }
}

const TaskList = collect(RawTaskList);

it('should handle adding an item to an array', () => {
  const { getByText, queryByText } = render(<TaskList />);

  expect(queryByText('Task list')).toBeNull();

  getByText('Add task').click();

  expect(getByText('Task list'));
  expect(getByText('Task number 1'));
});

it('should handle removing an item from an array', () => {
  const { getByText, queryByText } = render(<TaskList />);

  getByText('Add task').click();
  getByText('Add task').click();

  expect(getByText('Task number 2'));
  expect(getByText('Task number 3'));

  getByText('Remove last task').click();

  expect(queryByText('Task number 3')).toBeNull();
});

it('should handle deleting an entire array', () => {
  const { getByText, queryByText } = render(<TaskList />);

  expect(getByText('Task list'));

  getByText('Remove all tasks').click();

  expect(queryByText('Task list')).toBeNull();
});
