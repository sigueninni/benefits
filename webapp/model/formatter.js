sap.ui.define([
    "com/un/zhrbenefrequests/model/constants"
], function (constants) {
    "use strict";
    return {

        /* 
        Status codes with descriptions:
        00 - Draft
        01 - Request submitted by employee
        02 - Request approved by HRA
        03 - Request rejected by HRA
        04 - Request sent back to employee
        05 - Request approved by HRA and sent to HRO
        06 - Request approved by HRO, end of process
        07 - Request sent back to HRA 
        */

        requestStatusStateText: function (iStatus) {
            if (iStatus) {
                switch (iStatus) {
                    case constants.REQUEST_STATUS.DRAFT:
                        return "None";
                    case constants.REQUEST_STATUS.SUBMITTED:
                        return "Warning";
                    case constants.REQUEST_STATUS.APPROVED_HRA:
                        return "Success";
                    case constants.REQUEST_STATUS.REJECTED_HRA:
                        return "Error";
                    case constants.REQUEST_STATUS.RETURNED_TO_EMPLOYEE:
                        return "Warning";
                    case constants.REQUEST_STATUS.APPROVED_SENT_TO_H:
                        return "None";
                    case constants.REQUEST_STATUS.APPROVED_HRO_END:
                        return "Success";
                    case constants.REQUEST_STATUS.RETURNED_TO_HRA:
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

        /**
         * Formatter pour convertir la valeur du modèle en état du switch
         * true (state ON) correspond à 'N' dans le modèle
         * false (state OFF) correspond à '' (vide) dans le modèle
         * @param {string} sValue - La valeur du modèle ('N' ou '')
         * @returns {boolean} - L'état du switch
         */
        formatMultipleAttendanceState: function(sValue) {
            return sValue === 'N';
        },

        /**
         * Formatter pour déterminer l'état de la barre de progression basé sur le pourcentage de completion
         * @param {string|number} vPercentage - Pourcentage de completion (peut être string "75" ou number 75)
         * @returns {string} État UI5 (Success, Information, Warning, None, Error)
         */
        getCompletionState: function(vPercentage) {
            // Toujours commencer par Error comme valeur par défaut
            let sResult = "Error";
            
            try {
                // Convertir en nombre et gérer les cas null/undefined/empty/espaces
                let iPercentage = 0;
                
                if (vPercentage !== null && vPercentage !== undefined) {
                    if (typeof vPercentage === "string") {
                        const cleanValue = vPercentage.trim();
                        if (cleanValue !== "") {
                            iPercentage = parseFloat(cleanValue) || 0;
                        }
                    } else if (typeof vPercentage === "number") {
                        iPercentage = vPercentage;
                    }
                }
                
                // Déterminer l'état basé sur le pourcentage
                if (iPercentage >= 90) {
                    sResult = "Success";      // Vert - Presque complet (90%+)
                } else if (iPercentage >= 75) {
                    sResult = "Information";  // Bleu - Presque fini
                } else if (iPercentage >= 50) {
                    sResult = "Warning";      // Orange - À moitié
                } else if (iPercentage >= 25) {
                    sResult = "None";         // Défaut - En cours
                } else {
                    sResult = "Error";        // Rouge - Peu rempli (inclut 0%)
                }
                
            } catch (oError) {
                sResult = "Error"; // Fallback sûr
            }
            
            return sResult;
        },

        /**
         * Formatter pour la valeur de la ProgressIndicator
         * @param {string} vPercentage - Valeur du champ Completion
         * @returns {number} Valeur numérique pour percentValue
         */
        formatCompletionValue: function(vPercentage) {
            if (vPercentage !== null && vPercentage !== undefined && vPercentage !== "") {
                const cleanValue = typeof vPercentage === "string" ? vPercentage.trim() : vPercentage;
                if (cleanValue !== "") {
                    return parseFloat(cleanValue) || 0;
                }
            }
            return 0;
        },

        /**
         * Formatter pour l'affichage de la ProgressIndicator  
         * @param {string} vPercentage - Valeur du champ Completion
         * @returns {string} Texte d'affichage (ex: "75%")
         */
        formatCompletionDisplay: function(vPercentage) {
            // Logique similaire à formatCompletionValue mais pour l'affichage
            let iPercentage = 0;
            if (vPercentage !== null && vPercentage !== undefined && vPercentage !== "") {
                const cleanValue = typeof vPercentage === "string" ? vPercentage.trim() : vPercentage;
                if (cleanValue !== "") {
                    iPercentage = parseFloat(cleanValue) || 0;
                }
            }
            return iPercentage + "%";
        },

        /**
         * Determines the visibility of approval buttons (APPROVE, REJECT, RETURN)
         * These buttons should only be visible when the request status is "SUBMITTED" (01)
         * @param {string} sRequestStatus - The request status code
         * @returns {boolean} True if buttons should be visible, false otherwise
         */
        approvalButtonsVisibility: function (sRequestStatus) {
            return sRequestStatus === constants.REQUEST_STATUS.SUBMITTED;
        },

        /**
         * Determines the visibility of draft buttons (SUBMIT, DELETE)
         * These buttons should only be visible when the request status is "DRAFT" (00)
         * @param {string} sRequestStatus - The request status code
         * @returns {boolean} True if buttons should be visible, false otherwise
         */
        draftButtonsVisibility: function (sRequestStatus) {
            return sRequestStatus === constants.REQUEST_STATUS.DRAFT;
        }

    };



})