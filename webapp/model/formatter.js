sap.ui.define([], function () {
    "use strict";
    return {

        /* 
        00 F        Brouillon
        01 F        Demande soumise par l'employé
        02 F        Demande approuvée par HRA
        03 F        Demande rejetée par HRA
        04 F        Demande renvoyée vers l'employé
        05 F        Demande approuvée par HRA et envoyée vers HRO
        06 F        Demande approuvée par HRO, fin du processus
        07 F        Demande renvoyée vers HRA 
        */


        requestStatusStateText: function (iStatus) {
            if (iStatus) {
                switch (iStatus) {
                    case '00':
                        return "None";
                    case '01':
                        return "None";
                    case '02':
                        return "Success";
                    case '03':
                        return "Error";
                    case '04':
                        return "Warning";
                    case '05':
                        return "None";
                    case '06':
                        return "Success";

                    case '07':
                        return "Warning";
                    default:
                        return "None";
                }
            } else {
                return "None";
            }
        },

        formatTime: function (oTime) {
            if (oTime) {
                const oDate = new Date(oTime.ms);
                const sTimeinMilliseconds = oDate.getTime();
                let oTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
                    pattern: "HH:mm"
                });
                let TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
                let sTime = oTimeFormat.format(new Date(sTimeinMilliseconds + TZOffsetMs));
                return sTime;
            }
            return null;
        },

    };



})