import { copyFileSync, rmSync } from "fs";
import { join } from "path";

const mode = process.argv[ 2 ];

const sourceDir = "..";
const targetDir = ".";
const files = [
  "README.md",
  "LICENSE.txt"
];

switch ( mode ) {
  case "pre":
    files.forEach( ( file ) =>
      copyFileSync(
        join( sourceDir, file ),
        join( targetDir, file )
      )
    );
    break;
  case "post":
    files.forEach( ( file ) =>
      rmSync( join( targetDir, file ) )
    );
    break;

  default:
    console.warn( "mode must be pre or post" );
    break;
}