const { generateHTML } = require('@tiptap/html');
const Document = require('@tiptap/extension-document');
const Paragraph = require('@tiptap/extension-paragraph');
const Text = require('@tiptap/extension-text');
const TaskList = require('@tiptap/extension-task-list');
const TaskItem = require('@tiptap/extension-task-item');

const html = generateHTML({
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Task 1' }]
            }
          ]
        }
      ]
    }
  ]
}, [
  Document,
  Paragraph,
  Text,
  TaskList,
  TaskItem,
]);

console.log(html);
