HOST=dev6.axeda.com
USER=
PWD=

SCRIPTNAME=$1
PARAMS=$2

URL="http://$HOST/services/v1/rest/Scripto/execute/$SCRIPTNAME?$PARAMS"

echo $URL

curl -i --basic -u$USER:$PWD $URL
