import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceDocumentTextV1} from '../../scripts/audits/lib/source_document_text_v1.mjs';

test('audit text excludes script/style content with whitespace and attributed end tags',()=>{
  const html='<p>Published API</p><script>license commercial USD</script ><p>Daily prices</p><STYLE>terms</STYLE data-ignored="yes"><p>Contact</p>';
  assert.equal(sourceDocumentTextV1(html),'Published API Daily prices Contact');
});

test('audit text follows HTML comments, mixed-case tags, entities and inert templates',()=>{
  const html='<!-- terms --!><ScRiPt>commercial</sCrIpT foo="bar"><template>USD</template><p>Prices &amp; privacy&nbsp;policy</p>';
  assert.equal(sourceDocumentTextV1(html),'Prices & privacy policy');
});

test('an unclosed raw-text element cannot turn its content into visible audit evidence',()=>{
  assert.equal(sourceDocumentTextV1('<p>Public docs</p><script>license terms USD'),'Public docs');
});
