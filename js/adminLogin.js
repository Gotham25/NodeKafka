
let keygenApp = angular.module('keygenApp', []);
let tmp=[];
let popupCounter=0;

keygenApp.controller('keygenController', function($scope, $http) {

    $scope.sortType     = 'id'; // set the default sort type
    $scope.sortReverse  = false;  // set the default sort order
    $scope.searchRecord   = '';     // set the default search/filter term
    $scope.isAuthenticated = true;
    $scope.username = '';
    $scope.password = '';
    //$scope.keygen = [];
    $scope.keygen = [
        { id: 3, messageKey: "g9OPtWe", isLocked: false, createdDate: "2020-03-27 16:51:32", updatedAt: "2020-03-27 17:52:38" },
        { id: 4, messageKey: "hCORJwS", isLocked: false, createdDate: "2020-03-27 18:51:32", updatedAt: "2020-03-27 19:52:38" },
        { id: 1, messageKey: "CMwNQl3", isLocked: false, createdDate: "2020-03-27 20:51:32", updatedAt: "2020-03-27 21:52:38" },
        { id: 5, messageKey: "vUeEBHA", isLocked: false, createdDate: "2020-03-27 22:51:32", updatedAt: "2020-03-27 23:52:38" },
        { id: 2, messageKey: "eP7glhP", isLocked: false, createdDate: "2020-03-27 15:51:32", updatedAt: "2020-03-27 14:52:38" }
    ];

    //visibility modes
    $scope.headerIdVisibility = false;
    $scope.headerMessageKeyVisibility = true;
    $scope.headerIsLockedVisibility = true;
    $scope.headerCreatedDateVisibility = false;
    $scope.headerUpdatedAtVisibility = true;

    $scope.authenticateUser = function ($event) {
        
        $http.post("/authenticateUser", {
            "username": $scope.username,
            "password": $scope.password
        }, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-AUTH-USER-TOKEN": "V6ZgQ3hLTvWy1YSHfb3OVw"
            }
        }).then(function success(response) {
            // this function will be called when the request is success
            console.log("response: "+response.data.result);
            if(response.data.result === "success") {
                
                $http.post("/fetchUserKeys", {
                    "username": $scope.username,
                    "password": $scope.password
                }, {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "X-FETCH-USER-KEYS-TOKEN": "CGwX0RVwSjys5gheiILbHw"
                    }
                }).then(function success(response) {
                    //console.log(response.data);
                    if(response.data.result === "success") {
                        toast("Authenticated successfully !!!", "success");
                        response.data.keys.forEach((element, index) => {
                            $scope.keygen.push(element);
                        });
                    }
                    $scope.isAuthenticated = true;
                }, function error(response) {
                    //console.error(response.data.errorMessage);
                    toast(response.data.errorMessage, "danger");
                });

            } else {
                toast(response.data.result, "danger");
            }
        }, function error(response) {
            // this function will be called when the request returned error status
            //console.error(response.data.errorMessage);
            toast(response.data.errorMessage, "danger");
        });

        $event.preventDefault();
    };

});


function showPopup(message, alertType, popupId) {
    let popupDiv = document.createElement("div");
    let popupDismissTimeout = 5000;
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

function dismissPopup(popupId) {
    let popupDismissTimeout = 5000; 
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

function toast(message, alertType) {
    ++popupCounter;
    let popupId = "popup"+popupCounter;
    showPopup(message, alertType, popupId);
    setTimeout(() => {
        dismissPopup(popupId);
    }, 100);
}