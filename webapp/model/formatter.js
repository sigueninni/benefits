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
                        return "Information";
                    case constants.REQUEST_STATUS.APPROVED_HRA:
                        return "Success";
                    case constants.REQUEST_STATUS.REJECTED_HRA:
                        return "Error";
                    case constants.REQUEST_STATUS.RETURNED_TO_EMPLOYEE:
                        return "Warning";
                    case constants.REQUEST_STATUS.APPROVED_SENT_TO_H:
                        return "Information";
                    case constants.REQUEST_STATUS.APPROVED_HRO_END:
                        return "Success";
                    case constants.REQUEST_STATUS.RETURNED_TO_HRA:
                        return "Warning";
                    case constants.REQUEST_STATUS.SUBMITTED_CLAIMS:
                        return "Information";
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
         * Formatter pour convertir la valeur EGRUL (Apply Two Third Rule) en état de CheckBox
         * true (checked) correspond à '' (vide) dans le modèle
         * false (unchecked) correspond à 'N' dans le modèle
         * @param {string} sValue - La valeur du modèle ('' ou 'N')
         * @returns {boolean} - L'état de la CheckBox
         */
        formatEgrulState: function(sValue) {
            return sValue !== 'N';  // Coché si vide, décoché si 'N'
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

        // /**
        //  * CONDITIONAL BUTTON VISIBILITY FORMATTERS - COMMENTED OUT
        //  * ========================================
        //  * These formatters control the visibility of action buttons based on request status and user role
        //  * 
        //  * Business Rules:
        //  * - EMPLOYEE role: Can only see SUBMIT/DELETE buttons when request is in DRAFT status
        //  * - HRA role: Can see APPROVE/REJECT/RETURN buttons when request is SUBMITTED
        //  * - Floatbar: Visible for EMPLOYEE (DRAFT status) or HRA (SUBMITTED status)
        //  */

        // /**
        //  * Controls visibility of approval action buttons (APPROVE, REJECT, RETURN)
        //  * 
        //  * Visibility Rules:
        //  * - Request status must be SUBMITTED (01) 
        //  * - User role must NOT be EMPLOYEE (i.e., must be HRA or higher)
        //  * 
        //  * @param {string} sRequestStatus - Current request status code
        //  * @param {string} sUserRole - Current user role from detailView model
        //  * @returns {boolean} True if approval buttons should be visible
        //  */
        // approvalButtonsVisibility: function (sRequestStatus, sUserRole) {
        //     return sRequestStatus === constants.REQUEST_STATUS.SUBMITTED && 
        //            sUserRole !== constants.USER_ROLES.EMPLOYEE;
        // },

        // /**
        //  * Controls visibility of the floating toolbar (floatbar)
        //  * 
        //  * Visibility Rules:
        //  * - EMPLOYEE role: Visible when status is DRAFT (can edit/submit)
        //  * - HRA role: Visible when status is SUBMITTED (can approve/reject)
        //  * 
        //  * @param {string} sRequestStatus - Current request status code  
        //  * @param {string} sUserRole - Current user role from detailView model
        //  * @returns {boolean} True if floatbar should be visible
        //  */
        // draftButtonsVisibility: function (sRequestStatus, sUserRole) {
        //     return (sRequestStatus === constants.REQUEST_STATUS.DRAFT && sUserRole === constants.USER_ROLES.EMPLOYEE) ||
        //            (sRequestStatus === constants.REQUEST_STATUS.SUBMITTED && sUserRole !== constants.USER_ROLES.EMPLOYEE);
        // },

        // /**
        //  * Controls visibility of employee action buttons (SUBMIT, DELETE)
        //  * 
        //  * Visibility Rules:
        //  * - Request status must be DRAFT (00)
        //  * - User role must be EMPLOYEE
        //  * 
        //  * @param {string} sRequestStatus - Current request status code
        //  * @param {string} sUserRole - Current user role from detailView model  
        //  * @returns {boolean} True if submit/delete buttons should be visible
        //  */
        // submitDeleteButtonsVisibility: function (sRequestStatus, sUserRole) {
        //     return sRequestStatus === constants.REQUEST_STATUS.DRAFT && sUserRole === constants.USER_ROLES.EMPLOYEE;
        // }

        /**
         * Formats full name by concatenating first name and last name with a space
         * @param {string} sFirstName - The first name
         * @param {string} sLastName - The last name
         * @returns {string} Formatted full name "FirstName LastName"
         */
        formatFullName: function (sFirstName, sLastName) {
            if (!sFirstName && !sLastName) {
                return "";
            }
            return (sFirstName || "") + " " + (sLastName || "");
        },

        /**
         * Formats actor role code to human readable text
         * @param {string} sActorCode - The actor role code (00, 01, 02, 03)
         * @returns {string} Formatted actor role text
         */
        formatActorRole: function (sActorCode) {
            if (!sActorCode) {
                return "";
            }
            
            switch (sActorCode) {
                case constants.USER_ROLES.NO_ACTOR:
                    return "No Actor";
                case constants.USER_ROLES.EMPLOYEE:
                    return "Employee";
                case constants.USER_ROLES.HRA:
                    return "Human Resources Assistant";
                case constants.USER_ROLES.HRO:
                    return "Human Resources Officer";
                default:
                    return "Unknown Role (" + sActorCode + ")";
            }
        },

        /**
         * Formats request status code to human readable text
         * @param {string} sStatusCode - The request status code (00-07)
         * @returns {string} Formatted request status text
         */
        formatRequestStatusText: function (sStatusCode) {
            if (!sStatusCode) {
                return "";
            }
            
            switch (sStatusCode) {
                case constants.REQUEST_STATUS.DRAFT:
                    return "Draft";
                case constants.REQUEST_STATUS.SUBMITTED:
                    return "Submitted";
                case constants.REQUEST_STATUS.APPROVED_HRA:
                    return "Validated by HRA";
                case constants.REQUEST_STATUS.REJECTED_HRA:
                    return "Rejected by HRA";
                case constants.REQUEST_STATUS.RETURNED_TO_EMPLOYEE:
                    return "Returned";
                case constants.REQUEST_STATUS.APPROVED_SENT_TO_H:
                    return "Pending HRO";
                case constants.REQUEST_STATUS.APPROVED_HRO_END:
                    return "Approved";
                case constants.REQUEST_STATUS.RETURNED_TO_HRA:
                    return "Returned to HRA";
                case constants.REQUEST_STATUS.SUBMITTED_CLAIMS:
                    return "Submitted(Claims)";
                default:
                    return "Unknown Status (" + sStatusCode + ")";
            }
        },

        /**
         * Formats Info1 field state based on Isadvance and IsClaim flags
         * @param {string} sInfo1 - The Info1 field value
         * @param {boolean} bIsAdvance - Flag indicating if it's an advance
         * @param {boolean} bIsClaim - Flag indicating if it's a claim
         * @returns {string} State value for ObjectStatus (Error=Red, Success=Green, Warning=Orange)
         */
        info1StateText: function (sInfo1, bIsAdvance, bIsClaim) {
            if (!sInfo1) {
                return "None";
            }
            
            // Advance only (not claim) → Red
            if (bIsAdvance && !bIsClaim) {
                return "Error";
            }
            
            // Claim only (not advance) → Green
            if (!bIsAdvance && bIsClaim) {
                return "Success";
            }
            
            // Both advance and claim → Orange
            if (bIsAdvance && bIsClaim) {
                return "Warning";
            }
            
            return "None";
        }

        // /**
        //  * Formatter for marker flag visibility in Master list
        //  * @param {boolean} bIsAdvance - Whether it's an advance
        //  * @param {boolean} bIsClaim - Whether it's a claim
        //  * @param {string} sRequestStatus - Request status code
        //  * @returns {boolean} True if marker should be visible
        //  */
        // markerFlagVisible: function (bIsAdvance, bIsClaim, sRequestStatus) {
        //     // Show flag if: Isadvance=true AND (IsClaim=false OR (IsClaim=true AND RequestStatus="02"))
        //     if (bIsAdvance === true) {
        //         if (bIsClaim === false) {
        //             return true;
        //         }
        //         if (bIsClaim === true && sRequestStatus === "02") {
        //             return true;
        //         }
        //     }
        //     return false;
        // }

    };



})