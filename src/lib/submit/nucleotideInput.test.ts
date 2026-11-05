import {describe,it,expect} from "vitest";
import {validateNucleotideSubmission,nucleotideMessage} from "./nucleotideInput";
import {parseFasta} from "../utils/fasta";

describe("nucleotide submission policy",()=>{
  it("accepts IUPAC, RNA, lowercase, gaps and multiline whitespace without rewriting",()=>{
    const input="\ufeff>first title\nacgturyswkmbdhvn-.\n  >second\n A C\n G U\n";
    expect(validateNucleotideSubmission(input).valid).toBe(true);
    expect(input).toContain("acgturyswkmbdhvn-.");
  });
  it("finds the record and sequence position across lines before conversion",()=>{
    const result=validateNucleotideSubmission(">one\nACGT\n>two\nACGT\n>three\n AC\n GEF\n");
    expect(result.valid).toBe(false);
    expect(result.invalid).toEqual({record:3,position:4,characters:["E","F"]});
    expect(nucleotideMessage(result.invalid!,"zh")).toContain("第 3 条序列");
    expect(nucleotideMessage(result.invalid!,"en")).toContain("position 4");
  });
  it("retains generic protein previews and does not guess the origin of valid IUPAC letters",()=>{
    const protein=">one\nMELF\n>two\nMELF\n";
    expect(parseFasta(protein).valid).toBe(true);
    expect(validateNucleotideSubmission(protein).valid).toBe(false);
    expect(validateNucleotideSubmission(">one\nMKWV\n>two\nMKWV\n").valid).toBe(true);
  });
  it("keeps the paste size limit separate from an allowed file",()=>{
    const data=">one\n"+"A".repeat(110000)+"\n>two\n"+"A".repeat(110000);
    expect(validateNucleotideSubmission(data).valid).toBe(false);
    expect(validateNucleotideSubmission(data,Infinity).valid).toBe(true);
  });
});
