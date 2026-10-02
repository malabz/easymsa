import {describe,it,expect} from 'vitest';
import {taskMetadataSchema} from './taskMetadata';
const schema=taskMetadataSchema({jobName:'required',jobNameLength:'length',jobNameUnsafe:'unsafe',email:'email'});
describe('shared task metadata',()=>{
 it('trims and accepts Chinese task names and optional email',()=>expect(schema.parse({jobName:' 核酸测试（1） ',email:' '})).toEqual({jobName:'核酸测试（1）',email:''}));
 it.each(['','a'.repeat(65),'../task','unsafe/name','x<script>'])('rejects unsafe or invalid name %s',jobName=>expect(schema.safeParse({jobName,email:''}).success).toBe(false));
 it('validates email',()=>expect(schema.safeParse({jobName:'safe',email:'invalid'}).success).toBe(false));
});
