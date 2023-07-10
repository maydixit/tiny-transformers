
import { flatten } from 'underscore';
import { Template, escapeStr, template, namedVar, unEscapeStr } from './template';
import { NamedVar } from './variable';

// For each example substitution, substitute it into the template, and join it
// all together with the joinStr, into one big new template.
export function fewShotSubst<N extends string, N2s extends string>(
  templ: Template<N>,
  examples: { [Key in N]: string | NamedVar<N2s> }[],
  joinStr: string
): Template<N2s> {
  const vars = flatten(examples.map(e =>
    Object.values<string | NamedVar<N2s>>(e).filter(
      r => typeof r !== 'string'))) as NamedVar<N2s>[];
  return new Template(
    examples.map(e => templ.substs(e).escaped).join(joinStr), vars);
}

// A class representing a few shot template.
export class FewShotTempl<Ns extends string> {
  constructor(public template: Template<Ns>,
    public joinStr: string) { };

  apply<VarNs extends string>(
    examples: { [Key in Ns]: string | NamedVar<VarNs> }[]
  ): Template<VarNs> {
    return fewShotSubst(
      this.template, examples, this.joinStr);
  }
}
