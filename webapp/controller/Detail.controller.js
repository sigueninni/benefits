sap.ui.define([
    "com/un/zhrbenefrequests/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "com/un/zhrbenefrequests//model/formatter",
    "sap/base/strings/formatMessage",
    "sap/ui/core/ValueState",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",

],
    function (BaseController, JSONModel, formatter, formatMessage, ValueState, FlattenedDataset, FeedItem, MessageBox, MessageToast, Filter, FilterOperator) {
        "use strict";

        return BaseController.extend("com.un.zhrbenefrequests.controller.Detail", {

            formatter: formatter,
            formatMessage: formatMessage,

            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */
            onInit: function () {}



        });
    });