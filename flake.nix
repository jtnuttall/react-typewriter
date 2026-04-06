{
  description = "Jeremy's portfolio entrypoint";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      tooling-overlay = final: prev: {
        project-node = prev.nodejs_24;
        project-pnpm = prev.pnpm_10;
      };

      pkgs = import nixpkgs {
        inherit system;
        overlays = [tooling-overlay];
      };
    in {
      formatter = pkgs.alejandra;

      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          project-node
          project-pnpm
        ];
      };
    });
}
