export const methods = [
  {
    name: "MiniPOA",
    version: "1.0",
    origin: "lab",
    role: { en: "Partial order nucleotide alignment", zh: "核酸偏序图比对" },
    input: { en: "Unaligned nucleotide sequences", zh: "未比对核酸序列" },
    license: "MIT",
    source: "https://github.com/NCl3-lhd/minipoa",
    licenseUrl: "https://github.com/NCl3-lhd/minipoa/blob/main/LICENSE",
    paper: "https://doi.org/10.1101/gr.282046.126",
    title: "Fast and memory efficient partial order alignment with minipoa",
  },
  {
    name: "HAlign4",
    version: "2.0.0",
    origin: "lab",
    role: {
      en: "Large collections of related sequences",
      zh: "相关序列的大规模比对",
    },
    input: { en: "Unaligned nucleotide sequences", zh: "未比对核酸序列" },
    license: "MIT",
    source: "https://github.com/malabz/HAlign-4",
    licenseUrl: "https://github.com/malabz/HAlign-4/blob/main/LICENSE",
    paper: "https://doi.org/10.1093/bioinformatics/btae718",
    title:
      "HAlign 4: a new strategy for rapidly aligning millions of sequences",
  },
  {
    name: "FMAlign2",
    version: "2.0.0",
    origin: "lab",
    role: {
      en: "Alignment of long nucleotide sequences; website uses MAFFT backend",
      zh: "长核酸序列比对；网站使用 MAFFT 后端",
    },
    input: { en: "Unaligned nucleotide sequences", zh: "未比对核酸序列" },
    license: "Apache-2.0",
    source: "https://github.com/malabz/FMAlign2",
    licenseUrl: "https://github.com/malabz/FMAlign2/blob/master/LICENSE",
    paper: "https://doi.org/10.1093/bioinformatics/btae014",
    title:
      "FMAlign2: a novel fast multiple nucleotide sequence alignment method for ultralong datasets",
  },
  {
    name: "ReAlign-N",
    version: "01a602e-easymsa.1",
    origin: "lab",
    role: {
      en: "Local and global refinement (EasyMSA patched build)",
      zh: "局部与全局重比对（EasyMSA 补丁版本）",
    },
    input: {
      en: "Aligned ACGT- or ACGU- FASTA",
      zh: "已比对 ACGT- 或 ACGU- FASTA",
    },
    license: "GPL-3.0",
    source: "https://github.com/malabz/ReAlign-N",
    licenseUrl: "https://github.com/malabz/ReAlign-N/blob/main/LICENSE",
    paper: "https://doi.org/10.1093/nargab/lqae170",
    title:
      "ReAlign-N: an integrated realignment approach for multiple nucleic acid sequence alignment, combining global and local realignments",
  },
  {
    name: "MAFFT",
    version: "7.526",
    origin: "external",
    role: {
      en: "Alignment and dependency of refinement/FMAlign2",
      zh: "比对，以及重比对和 FMAlign2 的依赖",
    },
    input: {
      en: "Nucleotide sequences in this service",
      zh: "本服务使用核酸序列",
    },
    license: "BSD-style (see upstream terms)",
    source: "https://mafft.cbrc.jp/alignment/software/",
    licenseUrl: "https://mafft.cbrc.jp/alignment/software/license.txt",
    paper: "https://doi.org/10.1093/molbev/mst010",
    title:
      "MAFFT multiple sequence alignment software version 7: improvements in performance and usability",
  },
  {
    name: "Mash",
    version: "2.3",
    origin: "external",
    role: {
      en: "Distance estimation when required by Auto",
      zh: "Auto 按需使用的距离估计",
    },
    input: {
      en: "Preprocessed nucleotide sequences",
      zh: "预处理后的核酸序列",
    },
    license: "BSD-3-Clause core; bundled components retain other licenses",
    source: "https://github.com/marbl/Mash",
    licenseUrl: "https://github.com/marbl/Mash/blob/v2.3/LICENSE.txt",
    paper: "https://doi.org/10.1186/s13059-016-0997-x",
    title: "Mash: fast genome and metagenome distance estimation using MinHash",
  },
] as const;
