export enum Patch {
  TopLeft = 1 << 0,
  TopCenter = 1 << 1,
  TopRight = 1 << 2,
  Top = TopLeft | TopCenter | TopRight,

  MidLeft = 1 << 3,
  MidCenter = 1 << 4,
  MidRight = 1 << 5,
  Mid = MidLeft | MidCenter | MidRight,

  BotLeft = 1 << 6,
  BotCenter = 1 << 7,
  BotRight = 1 << 8,
  Bot = BotLeft | BotCenter | BotRight,

  Left = TopLeft | MidLeft | BotLeft,
  Center = TopCenter | MidCenter | BotCenter,
  Right = TopRight | MidRight | BotRight,

  Side = TopCenter | MidRight | BotCenter | MidLeft,
  Corner = TopLeft | TopRight | BotRight | BotLeft,

  All = Top | Mid | Bot,
}

export const patchTypes = [
  [ 0, 4, 24, 20 ],
  [ 0, 4, 20 ],
  [ 2, 24, 20 ],
  [ 0, 2,  20, 22 ],
  [ 2, 14, 22, 10 ],
  [ 0, 14, 24, 22 ],
  [ 2, 24, 22, 13, 11, 22, 20 ],
  [ 0, 14, 22 ],
  [ 6, 8, 18, 16 ],
  [ 4, 20, 10, 12, 2 ],
  [ 0, 2, 12, 10 ],
  [ 10, 14, 22 ],
  [ 20, 12, 24 ],
  [ 10, 2, 12 ],
  [ 0, 2, 10 ],
  [ 0, 4, 24, 20 ],
];


export class PatchGroup {

  constructor(
      public type: number,
      public invert: boolean,
      public turn: number,
      public curve: boolean,
      public scale: number,
  ) {

  }

  private step = 0;

  public getTurn = (patch: Patch) =>
    patch & ( Patch.MidRight | Patch.TopRight) ? this.step + 1 :
    patch & (Patch.BotCenter | Patch.BotRight) ? this.step + 2 :
    patch & (  Patch.MidLeft | Patch.BotLeft ) ? this.step + 3 :
    this.step;

}

interface Extra {
  red: number;
  green: number;
  blue: number;
}

const centerPatchTypes = [0, 4, 8, 15];

export class PatchConfiguration {

  public middle: PatchGroup;
  public corner: PatchGroup;
  public side: PatchGroup;
  public extra: Extra;

  toString() {
    const turns = ['U', 'R', 'D', 'L'];
    const o = this;
    const fmtT = (p: PatchGroup) => `${(p.invert ? '-' : '+')}${p.type.toString(16).toUpperCase()}${turns[p.turn]}`;
    const fmtX = (x: number) => x.toString(16).padStart(2, '0');
    const extra = `${fmtX(o.extra.red)}${fmtX(o.extra.green)}${fmtX(o.extra.blue)}`;
    return `M:${fmtT(o.middle)} S:${fmtT(o.side)} C:${fmtT(o.corner)} X:${extra}`;
  }

  constructor(code: number) {
    this.middle = new PatchGroup(
        centerPatchTypes[code & 0b11],
        ((code >> 14) & 1) != 0, // Always use side invert bit for now // ((code >> 2) & 1) != 0,
        0,
        ((code >> 27) & 3) == 3,
        (code >> 25) & 7,
    );
    this.corner = new PatchGroup(
        (code >> 3) & 0b1111,
        ((code >> 7) & 1) != 0,
        (code >> 8) & 3,
        ((code >> 21) & 3) == 3,
        (code >> 19) & 7,
    );
    this.side = new PatchGroup(
        (code >> 10) & 0b1111,
        ((code >> 14) & 1) != 0,
        (code >> 15) & 3,
        ((code >> 16) & 3) == 3,
        (code >> 14) & 7,
    );
    this.extra = {
      red: (code >> 27) & 31,
      green: (code >> 21) & 31,
      blue: (code >> 16) & 31,
    };
  }
}