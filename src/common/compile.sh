PATH=/usr/local/bin:$PATH
export PATH

stylus -u jeet -u rupture src/common/style/main.styl
kango build
open -a "/Applications/Google\ Chrome\ Canary.app" "http://reload.extensions"

