#!/bin/bash

BUILD_DIR=out
CONTENTS="
*.js
*.css
*.html
*.json
*.png
images
lib
ui-lightness
"

mkdir -p $BUILD_DIR

# Poor man's JSON parser :)
version=$(awk -v FS=: '/"version"/ {
  match($2, "\".*\"")
  trimmed = substr($2, RSTART+1, RLENGTH-2)
  print trimmed
}' manifest.json)

outFile=$BUILD_DIR/imdb-warzat-$version.zip

zip $outFile $CONTENTS
echo Built $outFile
