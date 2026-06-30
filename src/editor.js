import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';

export function createEditor(container, initialDoc, onChange) {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      yaml(),
      oneDark,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      updateListener,
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
        '.cm-content': { padding: '12px 0' },
        '.cm-gutters': { border: 'none', backgroundColor: '#1e1e2e' },
      }),
    ],
  });

  return new EditorView({ state, parent: container });
}
