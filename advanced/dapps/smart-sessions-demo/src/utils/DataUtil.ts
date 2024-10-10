export type DemoAppMetadata = {
  title: string;
  link: string;
  description: string;
  randomLinks?: string[];
};

export const smartSessionsDemoAppMetadata: DemoAppMetadata[] = [
  {
    title: "DCA",
    link: "/demo/dca",
    description: "Dollar Cost Averaging Dapp Demo",
  },
  {
    title: "TicTacToe",
    link: "/demo/tictactoe",
    description: "Play TicTacToe",
  },
];
