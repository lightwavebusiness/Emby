export SASS_LIBSASS_PATH=/Users/Ajnin/libsass
cd /Users/Ajnin/Desktop/Emby
stylus -u jeet -u rupture src/common/style/main.styl
kango build
/Users/Ajnin/sassc/bin/sassc src/common/style/materialize.scss > src/common/style/materialize.css
open -a '/Applications/Google\ Chrome\ Canary.app' > /dev/null

