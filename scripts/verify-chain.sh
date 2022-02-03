# -e  exit on failure error codes
# -u  error on unknown variables
# -o  exit on errors in pipes
set -euo pipefail

# execute the script in the context of the project's root directory
project_root=$(cd "$(dirname ${BASH_SOURCE[0]})/.."; pwd -P)
cd "$project_root"

programName=$0

function usage {
    echo "Usage: $programName [OPTION]... FILE"
    echo "   or: $programName [OPTION]... -"
    echo "   or: $programName FILE  [OPTION]..."
    echo "   or: $programName -     [OPTION]..."
    echo "   or: $programName"
    echo ""
    echo "     --*              arguments for scripst/verify.sh"
    echo "     --chainid        id of the chain"
    exit $1 || "0";
}

chainId=