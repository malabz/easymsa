// Homepage illustration of feature-guided method selection; independent of runtime model labels.
// Branches are teaching examples, not records of a user task or a new selector.
export type HomeTreeNode = { id: number; depth: number; feature?: string; method?: string; leaf?: number; left?: number; right?: number };
export const HOME_TREE_NODES: HomeTreeNode[] = [{"id":0,"depth":0,"feature":"kmer_diversity","left":1,"right":16},{"id":1,"depth":1,"feature":"length_std","left":2,"right":9},{"id":2,"depth":2,"feature":"similarity_std","left":3,"right":6},{"id":3,"depth":3,"feature":"sequence_heterogeneity","left":4,"right":5},{"id":4,"depth":4,"method":"minipoa","leaf":0},{"id":5,"depth":4,"method":"HAlign","leaf":1},{"id":6,"depth":3,"feature":"kmer_distinct","left":7,"right":8},{"id":7,"depth":4,"method":"minipoa","leaf":2},{"id":8,"depth":4,"method":"minipoa","leaf":3},{"id":9,"depth":2,"feature":"kmer_diversity","left":10,"right":13},{"id":10,"depth":3,"feature":"sequence_heterogeneity","left":11,"right":12},{"id":11,"depth":4,"method":"minipoa","leaf":4},{"id":12,"depth":4,"method":"HAlign","leaf":5},{"id":13,"depth":3,"feature":"similarity_std","left":14,"right":15},{"id":14,"depth":4,"method":"HAlign","leaf":6},{"id":15,"depth":4,"method":"HAlign","leaf":7},{"id":16,"depth":1,"feature":"mash_distance_p99","left":17,"right":24},{"id":17,"depth":2,"feature":"similarity_std","left":18,"right":21},{"id":18,"depth":3,"feature":"mash_distance_std","left":19,"right":20},{"id":19,"depth":4,"method":"minipoa","leaf":8},{"id":20,"depth":4,"method":"minipoa","leaf":9},{"id":21,"depth":3,"feature":"kmer_diversity","left":22,"right":23},{"id":22,"depth":4,"method":"minipoa","leaf":10},{"id":23,"depth":4,"method":"minipoa","leaf":11},{"id":24,"depth":2,"feature":"length_std","left":25,"right":28},{"id":25,"depth":3,"feature":"sequence_heterogeneity","left":26,"right":27},{"id":26,"depth":4,"method":"HAlign","leaf":12},{"id":27,"depth":4,"method":"fmalign2","leaf":13},{"id":28,"depth":3,"feature":"mash_distance_std","left":29,"right":30},{"id":29,"depth":4,"method":"minipoa","leaf":14},{"id":30,"depth":4,"method":"HAlign","leaf":15}];
export const HOME_TREE_PATHS: Record<string, number[]> = {"minipoa":[0,1,2,3,4],"HAlign":[0,1,2,3,5],"fmalign2":[0,16,24,25,27]};
export const HOME_TREE_METHODS = ["minipoa", "HAlign", "fmalign2"];
export const HOME_TREE_FEATURES: Record<string, {zh: string; en: string}> = {
  kmer_diversity: { zh: "片段多样性", en: "K-mer diversity" },
  length_std: { zh: "长度分布", en: "Length variation" },
  similarity_std: { zh: "序列相似性", en: "Similarity" },
  sequence_heterogeneity: { zh: "序列异质性", en: "Sequence heterogeneity" },
  kmer_distinct: { zh: "片段种类", en: "Distinct k-mers" },
  mash_distance_p99: { zh: "序列差异", en: "Sequence distance" },
  mash_distance_std: { zh: "差异分布", en: "Distance variation" },
};
