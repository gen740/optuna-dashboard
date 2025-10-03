{
  description = "Flake shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs =
    inputs@{ flake-parts, nixpkgs, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = nixpkgs.lib.platforms.all;

      perSystem =
        { pkgs, ... }:
        {
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              llvmPackages.libcxxClang
              llvmPackages.lld
              python3Packages.venvShellHook
              gnumake
              nodejs
              uv
              binaryen
              cargo
              wasm-bindgen-cli
            ];
            venvDir = "venv";
          };
        };
    };
}
