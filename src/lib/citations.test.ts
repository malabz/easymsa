import {describe,expect,it} from 'vitest';
import {methods} from './methods';
import {citationDetails,formatCitation} from './citations';
describe('method citations',()=>{
 it('has verified author and publication locations for every linked paper',()=>{
  for(const method of methods)for(const publication of [method,...('additionalPapers' in method?method.additionalPapers:[])]){
   const details=citationDetails[publication.paper];
   expect(details.authors).not.toBe('');expect(details.volume).not.toBe('');expect(details.pages).not.toBe('');
   const citation=formatCitation(publication);
   expect(citation).toContain(publication.title);expect(citation).toContain(publication.paper);expect(citation).toContain(String(publication.year));
  }
 });
});
