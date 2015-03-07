#!/bin/bash

# Required API Keys ######################
# $NETFLIX_CONSUMER_KEY
# $NETFLIX_CONSUMER_SECRET
# $PARSE_APP_ID
# $PARSE_JS_KEY
# $REDBOX_API_KEY
# $ROVI_API_KEY

BUILD_DIR=${CIRCLE_ARTIFACTS:-$(pwd)/out}
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

for t in *.template
do
    tOut=${t:0:-9}
    echo Populating $tOut from $t
    envsubst < $t > $tOut
done

outFile=$BUILD_DIR/imdb-warzat-$version.zip

set -x
zipRoot=$BUILD_DIR/imdb-warzat
mkdir -p $zipRoot
cp -r $CONTENTS $zipRoot

(cd $BUILD_DIR; zip -r $outFile imdb-warzat) && rm -rf $zipRoot

echo Built $outFile
