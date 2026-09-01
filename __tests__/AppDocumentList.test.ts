import {Document} from '../src/data/models';
import {documentsWithPages, uniqueDocuments} from '../src/app/App';

function doc(id: string): Document {
  return {id, title: id, status: 'draft', pages: [], createdAt: '2026-01-01', updatedAt: '2026-01-01'};
}

test('removes duplicate document ids before rendering home list', () => {
  const first = doc('doc-local');
  const second = doc('doc-other');
  expect(uniqueDocuments([first, first, second, doc('doc-other')]).map(item => item.id)).toEqual(['doc-local', 'doc-other']);
});

test('filters out empty initialization documents before restoring local state', () => {
  const empty = doc('doc-local');
  const saved = {...doc('doc-saved'), pages: [{id: 'page-1'} as Document['pages'][number]]};

  expect(documentsWithPages([empty, saved]).map(item => item.id)).toEqual(['doc-saved']);
});
