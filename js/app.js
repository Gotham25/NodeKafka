
let keygenApp = angular.module('keygenApp', []);
let popupCounter = 0;
let tmp = null;

keygenApp.controller('keygenController', function($scope, $http) {

    let generateBlock = "Generate code";
    let lockBlock = "Lock key";

    $scope.generatedText = "";
    $scope.showGeneratedCodeBlock = false;

    function getLoadingBlock(message) {
        return "<span class=\"spinner-border spinner-border-sm\" role=\"status\" aria-hidden=\"true\"></span>&nbsp;&nbsp;"+message;
    }

    $scope.generate = function(e) {

        e.target.innerHTML = getLoadingBlock("Generating...");
        let disabedAttr = document.createAttribute("disabled");
        disabedAttr.value = "";
        e.target.attributes.setNamedItem(disabedAttr);

        $http.get("/getKey", {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-MESSAGE-KEY-TOKEN": "Z9IyOis6RDWxKg6muuJlqg"
            }
        }).then(function success(response) {
            // this function will be called when the request is success
            //console.log("response: "+JSON.stringify(response));
            toast("Generated code successfully !!!", "success", 10000);
            $scope.generatedText = response.data.key;
            console.debug(response.data.comment);
            e.target.innerHTML = generateBlock;
            $scope.showGeneratedCodeBlock = true;
        }, function error(response) {
            // this function will be called when the request returned error status
            e.target.innerHTML = generateBlock;
            e.target.attributes.removeNamedItem("disabled");
            console.error("Error: "+response.data.errorMessage);
            toast("Error in generating code...", "danger", 10000);
        });

    };

    $scope.lockKey = function(e) {
        
        e.target.innerHTML = getLoadingBlock("Locking...");
        let disabedAttr = document.createAttribute ("disabled");
        disabedAttr.value = "";
        e.target.attributes.setNamedItem(disabedAttr);

        $http.post("/lockKey", {
            "key": $scope.generatedText,
            "status": "lock"
        }, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-MESSAGE-KEY-TOKEN": "Z9IyOis6RDWxKg6muuJlqg"
            }
        }).then(function success(response) {
            // this function will be called when the request is success
            //console.log("lockKey_success: "+JSON.stringify(response));
            console.log(response.data.comment);
            e.target.innerHTML = lockBlock;
            toast("Locked code successfully !!!", "success", 10000);
        }, function error(response) {
            // this function will be called when the request returned error status
            //console.error(response.data.errorMessage);
            toast("Error in locking the code...", "danger", 10000);
            e.target.innerHTML = lockBlock;
            e.target.attributes.removeNamedItem("disabled");
            console.log("lockKey_error: "+JSON.stringify(response));
        });

    };

    $scope.clearKey = function(e) {
        $scope.showGeneratedCodeBlock=false;
        $scope.generatedText="";
        $("#generateCode").html(generateBlock);
        $("#generateCode").prop("disabled", false);
    }

    $("#copyText").mouseover(function(){
        $(this).attr('data-original-title', 'Click to copy to clipboard').tooltip('show');
    });

    var clipboard = new ClipboardJS('.copyButton');
    clipboard.on('success', function(e) {
        let msg = "Copied to clipboard";
        console.log(msg);
        $("#copyText").attr('data-original-title', 'Copied...').tooltip('show');
        toast(msg+" successfully !!!", "success");
    });
    clipboard.on('error', function(e) {
        let errMsg = "Error in copying to clipboard";
        console.error(errMsg);
        toast(errMsg, "danger");
    });

});


function showPopup(message, alertType, popupId, customTimeout) {
    let popupDiv = document.createElement("div");
    let popupDismissTimeout = customTimeout;
    popupDiv.id = popupId;
    popupDiv.style.cssText = "display: inline-block; width: 350px; margin-top: 2px; margin-right: 2px;";
    popupDiv.className = "alert alert-"+alertType;
    popupDiv.innerHTML = message;
    popupDiv.style.transition = "opacity "+popupDismissTimeout+"ms";
    popupDiv.style.opacity = 1;
    let popupMain = document.getElementById("popup");
    if(popupMain === undefined || popupMain === null) {
        popupMain = document.createElement("div");
        popupMain.id = "popup";
        popupMain.style.cssText = "display: inline-block; max-width: 350px; position: absolute; top: 0px; right: 0px; margin-top: 10px; margin-right: 10px;";
        popupMain.appendChild(popupDiv);
        document.body.appendChild(popupMain);
    } else {
        popupMain.appendChild(popupDiv);
    }
}

function dismissPopup(popupId, customTimeout) {
    let popupDismissTimeout = customTimeout; 
    let popupDiv = document.getElementById(popupId);
    popupDiv.style.transition = "opacity "+popupDismissTimeout+"ms ease";
    popupDiv.style.opacity = 0;
    setTimeout(() => {
        document.getElementById(popupId).parentNode.removeChild(popupDiv);
        let popupMain = document.getElementById("popup");
        if(popupMain != null && popupMain.innerHTML === "") {
            popupMain.parentNode.removeChild(popupMain);
        }
    }, popupDismissTimeout);
}

function toast(message, alertType, customTimeout=5000) {
    ++popupCounter;
    let popupId = "popup"+popupCounter;
    showPopup(message, alertType, popupId, customTimeout);
    setTimeout(() => {
        dismissPopup(popupId, customTimeout);
    }, 100);
}