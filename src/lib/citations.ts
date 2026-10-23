// Bibliographic fields checked 2026-10-23 against Crossref DOI records.
// minipoa: https://genome.cshlp.org/content/36/9/1849
// FMAlign uses the 2022 volume/issue year (online publication was 2021).
export const citationDetails: Record<string, {authors: string; volume: string; issue: string; pages: string}> = {
  "https://doi.org/10.1093/molbev/msac166": {
    "authors": "Furong Tang, Jiannan Chao, Yanming Wei, Fenglong Yang, Yixiao Zhai, Lei Xu, Quan Zou",
    "volume": "39",
    "issue": "8",
    "pages": "msac166"
  },
  "https://doi.org/10.1186/s13059-025-03881-3": {
    "authors": "Pinglu Zhang, Tong Zhou, Yanming Wei, Qinzhong Tian, Yixiao Zhai, Yizheng Wang, Quan Zou, Furong Tang, Ximei Luo",
    "volume": "26",
    "issue": "1",
    "pages": "406"
  },
  "https://doi.org/10.1093/bioinformatics/btae718": {
    "authors": "Tong Zhou, Pinglu Zhang, Quan Zou, Wu Han",
    "volume": "40",
    "issue": "12",
    "pages": "btae718"
  },
  "https://doi.org/10.1093/bib/bbab519": {
    "authors": "Huan Liu, Quan Zou, Yun Xu",
    "volume": "23",
    "issue": "1",
    "pages": "bbab519"
  },
  "https://doi.org/10.1093/bioinformatics/btae014": {
    "authors": "Pinglu Zhang, Huan Liu, Yanming Wei, Yixiao Zhai, Qinzhong Tian, Quan Zou",
    "volume": "40",
    "issue": "1",
    "pages": "btae014"
  },
  "https://doi.org/10.1093/nargab/lqae170": {
    "authors": "Yixiao Zhai, Tong Zhou, Yanming Wei, Quan Zou, Yansu Wang",
    "volume": "6",
    "issue": "4",
    "pages": "lqae170"
  },
  "https://doi.org/10.1093/molbev/mst010": {
    "authors": "K. Katoh, D. M. Standley",
    "volume": "30",
    "issue": "4",
    "pages": "772-780"
  },
  "https://doi.org/10.1186/s13059-016-0997-x": {
    "authors": "Brian D. Ondov, Todd J. Treangen, Páll Melsted, Adam B. Mallonee, Nicholas H. Bergman, Sergey Koren, Adam M. Phillippy",
    "volume": "17",
    "issue": "1",
    "pages": "132"
  },
  "https://doi.org/10.1101/gr.282046.126": {
    "authors": "Haodong Liu, Pinglu Zhang, Yanming Wei, Qinzhong Tian, Yixiao Zhai, Quan Zou, Mengting Niu",
    "volume": "36",
    "issue": "9",
    "pages": "1849–1862"
  }
};

export function formatCitation(publication: {title: string; journal: string; year: number; paper: string}) {
 const detail = citationDetails[publication.paper];
 const location = detail ? `${detail.volume}${detail.issue ? `(${detail.issue})` : ""}${detail.pages ? `: ${detail.pages}` : ""}` : "";
 return `${detail ? `${detail.authors}. ` : ""}${publication.title}. ${publication.journal}. ${publication.year}${location ? `; ${location}` : ""}. ${publication.paper}`;
}
