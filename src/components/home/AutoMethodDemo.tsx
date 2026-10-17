import { ArrowRight, ArrowUpRight, Check, GitBranch, GitCompareArrows, Leaf, Network, RotateCcw, Ruler } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { homeAdvantagesContent } from "../../lib/homeContent";
import { useHomeAnimation } from "./HomeDemoProvider";
import { DecisionTreeCanvas } from "./DecisionTreeCanvas";
import { HOME_TREE_FEATURES, HOME_TREE_METHODS, HOME_TREE_NODES, HOME_TREE_PATHS } from "./homeDecisionTreeData";

export function AutoMethodDemo() {
  const { locale } = useLanguage();
  const copy = homeAdvantagesContent[locale];
  const root = useRef<HTMLElement>(null);
  const animation = useHomeAnimation(root, 24000);
  const caseIndex = Math.min(2, Math.floor(animation.progress * 3));
  const progress = (animation.progress * 3) % 1;
  const method = HOME_TREE_METHODS[caseIndex];
  const step = Math.min(4, Math.floor(Math.max(0, (progress - .12) / .55) * 4));
  const complete = progress >= .67;
  const current = HOME_TREE_NODES[HOME_TREE_PATHS[method][Math.min(3, step)]];
  const features = [
    { key: "kmer_diversity", label: copy.treeFeatures[0], icon: Network },
    { key: "length_std", label: copy.treeFeatures[1], icon: Ruler },
    { key: "similarity_std", label: copy.treeFeatures[2], icon: GitCompareArrows },
    { key: "sequence_heterogeneity", label: copy.treeFeatures[3], icon: Leaf },
  ];
  return <section ref={root} className="home-section home-smart-match" aria-labelledby="home-methods-title">
    <div className="home-decision-heading">
      <div className="home-benefit-heading">
        <h2 id="home-methods-title">{copy.autoTitle}</h2>
        <p>{copy.autoIntro}</p>
      </div>
      <Link to="/about" className="home-text-link">{copy.methodLink}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
    <div className="home-decision-workflow" data-method={method} data-complete={complete}>
      <div className="home-decision-features">
        <p className="home-decision-label">{copy.featureLabel}</p>
        <ul>{features.map(({key, label, icon: Icon}) => <li key={key} data-active={!complete && current.feature === key}>
          <Icon size={20} aria-hidden="true" /><span>{label}</span>
        </li>)}</ul>
        <span className="home-decision-note">{copy.featuresNote}</span>
      </div>
      <div className="home-decision-tree">
        <p className="home-decision-label"><GitBranch size={16} aria-hidden="true" />{copy.treeLabel}</p>
        <DecisionTreeCanvas method={method} progress={progress} locale={locale} label={copy.treeAnimationLabel} />
      </div>
      <div className="home-decision-methods" aria-label={copy.candidateLabel}>
        <p className="home-decision-label">{copy.selectionLabel}</p>
        <ul>{HOME_TREE_METHODS.map(name => <li key={name} data-selected={complete && name === method}>
          <span>{name}</span>{complete && name === method ? <Check size={19} aria-hidden="true" /> : null}
        </li>)}</ul>
        <p className="home-decision-action" data-ready={complete}><ArrowRight size={16} aria-hidden="true" />{copy.runAlignment}</p>
      </div>
    </div>
    <div className="home-decision-footer">
      <p><span className="home-decision-step">{complete ? "03" : step === 0 ? "01" : "02"}</span>
        {complete ? `${copy.selectedPrefix} ${method}` : step === 0 ? copy.scanning : `${copy.evaluating} ${HOME_TREE_FEATURES[current.feature!][locale]}`}</p>
      <button type="button" onClick={() => { animation.setProgress(0); animation.setPlaying(true); }}>
        <RotateCcw size={14} aria-hidden="true" />{copy.replay}
      </button>
    </div>
  </section>;
}
