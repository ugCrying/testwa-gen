# adb install STFService.apk

adb shell am startservice --user 0 \
    -a jp.co.cyberagent.stf.ACTION_START \
    -n jp.co.cyberagent.stf/.Service

adb forward tcp:1100 localabstract:stfservice

nc localhost 1100