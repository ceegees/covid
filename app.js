const lat = 10.8505;
const lon = 76.2711;
var latLng = L.latLng(lat, lon);
const safeZoneDuration = 3 * 24;
var map = new L.Map('leaflet', {
    center: latLng,
    zoom: 10,
    layers: [
        new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            'attribution': 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        })
    ]
});

const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
});

const greenIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
});

let path =  document.location.pathname
let gPatient = "";
if (path.indexOf("/r/") >= 0){
    gPatient =  path.replace("/r/","");
}

let gDataList = [];
let patientFilter = "";
function renderPoints() {
    let midLat = 0;
    let midLon = 0
    let total = 0;
    const secs = $("#timeline-slide").val()
    $("#time-show").html(moment(secs * 1000).format('YYYY-MM-DD hh:mm a'));
    const filterDate = moment(secs * 1000);
    const itemList = [];
    let center = null;
    gDataList.forEach(function (item) {
        const diffb = filterDate.diff(item.timeFrom, 'hours');
        const diffe = filterDate.diff(item.timeTo, 'hours');
        if (gPatient != '' && item.cluster !== gPatient) {
            return;
        }
        if (diffb < 0 || diffe > safeZoneDuration) {
            item.marker.remove();
            // item.marker.setIcon(greenIcon).setOpacity(0.5);
            return;
        }

        total++;
        const opacity = ((safeZoneDuration - diffe)*2 / (safeZoneDuration)).toFixed(4);
        const m = item.marker.addTo(map).setOpacity(opacity);
        const diff = diffe > 0 ? diffe : diffb;
        m.bindPopup("<b>" + item.locationName + ",  Potential infection " + diff + " hours ago </b>" +
            "<br/> " + item.timeFrom.format('YYYY/MM/DD HH:mm') + " to " + item.timeTo.format('YYYY/MM/DD HH:mm'));
        item.hrDiff = diff;
        itemList.unshift(item);
        center = item.marker.getLatLng();
    });

    console.log('total points', total);
    vueApp.title = 'Case Route  at : ' + moment(secs * 1000).format('YYYY-MM-DD hh:mm a');
    vueApp.itemList = itemList;
    if (center) {
        map.setView(center);
    }
}

function sidebarToggle() {
    const sidebarCls = document.getElementById("appSidebar").classList
    if (sidebarCls.contains('w3-show')) {
        sidebarCls.remove('w3-show');
        sidebarCls.add('w3-hide');
    } else if (sidebarCls.contains('w3-hide')) {
        sidebarCls.remove('w3-hide');
        sidebarCls.add('w3-show');
    }
}
let gPlayTimer = null;
function handlePlay() {
    const leafCls = document.getElementById("leaflet").classList
    if (gPlayTimer) {
        clearInterval(gPlayTimer);
        $("#playButton").html('Play');
        gPlayTimer = null;
        return;
    }

    if (leafCls.contains('s12')) {
        leafCls.remove('s12');
        leafCls.add('s6');
        leafCls.add('m9');
        
    }
    $("#playButton").html('Stop');
    gPlayTimer = setInterval(function () {
        let current = parseInt($("#timeline-slide").val());
        current += (1800)
        $("#timeline-slide").val(current);
        renderPoints();
        if (current > $("#timeline-slide").attr('max')) {
            clearInterval(gPlayTimer);
            gPlayTimer = null;
            $("#playButton").html('Play');
            if (leafCls.contains('s6')) {
                leafCls.remove('s6');
                leafCls.remove('m9');
                leafCls.add('s12');
            }
        }
    }, 200);

}
function toRad(val) {
    return val * Math.PI / 180;
}
 

function distance(lat1, lon1, lat2, lon2) {
 
    var R = 6371000; // km  
    var x1 = lat2-lat1;
    var dLat = toRad(x1);  
    var x2 = lon2-lon1;
    var dLon = toRad(x2);  
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);  
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;  
   
}


Vue.component('info-item', {
    props: ['item'],
    template: document.getElementById('locationBlock').innerHTML
})

var vueApp = new Vue({
    el: '#sidebarInfo',
    data: {
        title: 'Case Route',
        itemList: [
        ]
    }
});

function checkForLocation(locationList){ 
    const uLocLen = locationList.length;
    const gIdx = 0;
    const gLen = gDataList.length; 
    const zoneList = [];

    for(var uIdx = 0;uIdx < uLocLen && gIdx < gLen;uIdx++) {
        const uLoc = locationList[uIdx];
        const lat1 = uLoc.latitudeE7/10000000;
        const lon1 = uLoc.longitudeE7/10000000;
        const first = gDataList[0]; 
        if (first.utcFrom > uLoc.timestampMs) {
            continue;
        }

        for (var idx = 0;idx < gDataList.length;idx++) {
            // we will optimize it later ;)
            const zone = gDataList[idx];
            if ( uLoc.timestampMs > zone.utcFrom  &&  uLoc.timestampMs  < zone.utcTo ) {
                
                const d = distance(lat1,lon1,zone.locationLat,zone.locationLon);
                // console.log(uLoc,d)
                if (d < 100) {
                    const item = zoneList.find(function(item) {
                        return item.zone === zone;
                    });
                    if (!item) {
                        zoneList.push({
                            zone :zone ,
                            loc : uLoc
                        });
                    }
                }
            }
        }

        if (uIdx % 100 == 0) { 
            $("#modal-data").html('<div class="w3-padding-small">Processed  '+uIdx + ' of '
            + uLocLen+' values</div>'); 
        }
    }

    const msgList = [];
    if (zoneList.length == 0) {
        msgList.push('<div class="w3-padding-64">Based on the location data we have released by district collectors of Kerala Govt,<br/> You were not near any of the infection zones at the specified time.</div>');
    } else {
        zoneList.forEach(function(item) {
            msgList.push(
                '<div class="w3-border-bottom w3-small w3-leftbar w3-border-blue w3-padding w3-section">You were near ' + item.zone.locationName 
                + ' During '
                + moment(item.zone.utcFrom).format('YYYY/MM/DD hh:mm a') 
                + ' to ' 
                + moment(item.zone.utcTo).format('YYYY/MM/DD hh:mm a') 
                + ' which is a potential infection zone </div>'
            );
        });
        msgList.push('Please report on Disha ');
    }
    $("#modal-data").html('<div><b>Processing Completed for '+uLocLen +' values</b></div>' + msgList.join('') ); 
}


function handleLocationFile(evt) {
    file = document.getElementById('locationFile').files[0];
    if (evt) {
        file = evt.target.files[0];
    }
    if (!file) {
        alert('Please a select file by taking out data from google');
        return
    }
    const reader = new FileReader();
    reader.onload = function(e) { 
        document.getElementById('location-check-modal').classList.add('w3-show');
       const data =  JSON.parse(e.target.result); 
       if (!data || !data.locations){
           alert('Unable to process the File,please make sure you are uplaoding correct file ')
           return;
       }
       checkForLocation(data.locations);
    } 
    reader.readAsText(file,'UTF-8');
} 

function loadData(resp) {
    const clusters = [];
    gDataList = d3.csvParse(resp).filter(function (item, idx) {
        if (!item.locationLat || isNaN(item.locationLat) || isNaN(item.locationLon)) {
            console.log('Invalid Lat Lon at : ', idx);
            return false;
        }
        const mo1 = moment(item.timeFrom + ":00", "DD/MM/YYYY");
        const mo2 = moment(item.timeTo + ":00", "DD/MM/YYYY");
        if (!mo1.isValid() || !mo2.isValid()) {
            console.log("Invalid time at : ", idx);
            return false;
        }
        return true;
    }).map(function (item) {
        const lat = parseFloat(item.locationLat);
        const lon = parseFloat(item.locationLon)
        var latlng = L.latLng(lat, lon);
        item.marker = L.marker(latlng,{
            icon: redIcon
        });
        if (clusters.indexOf(item.cluster) == -1) {
            clusters.push(item.cluster);
        }
        item.timeFrom = moment(item.timeFrom + ":00", "DD/MM/YYYY HH:mm:SS");
        item.timeTo = moment(item.timeTo + ":00", "DD/MM/YYYY HH:mm:SS");
        item.utcFrom = item.timeFrom.toDate().getTime();
        item.utcTo = item.timeTo.toDate().getTime() + safeZoneDuration * 3600*1000;
        return item;
    });

    console.log(gDataList);
    const strList = clusters.map(function(item) {
        return '<li><a class="w3-block" href="/r/'+item+'">'+item+'</a></li>';
    });
    strList.push('<li><a class="w3-block" href="/">All</a></li> ');
    $("#block-info-page").html(strList.join(''));

    if (gPatient != '' && gDataList.length > 0 ){
        const item = gDataList.find(function(item) {
            return item.cluster == gPatient
        });
        if (item) {
            const start = item.timeFrom.toDate().getTime() / 1000;
            $("#timeline-slide").val(start);
        }
    }
    renderPoints();
}
$(document).ready(function () {
    const start = new Date(2020, 01, 29).getTime() / 1000;
    $("#timeline-slide").attr('min', start);
    $("#timeline-slide").attr('max', Math.floor(new Date().getTime() / 1000));
    $("#timeline-slide").attr('step', 1800);
    $("#timeline-slide").on('change', renderPoints);
    $("#info-button").on('click', function () {
        $("#id01").css({ display: 'block' })
    });
    $("#locationFile").on('change', handleLocationFile);
    $("#playButton").on('click', handlePlay);

    // https://docs.google.com/spreadsheets/d/1MrNksozFNPM9V3OkOEtrN7UzdlVNriRhIdJK5w2zfhw/export?format=csv&id=1MrNksozFNPM9V3OkOEtrN7UzdlVNriRhIdJK5w2zfhw&gid=1546417465
    $.get('https://docs.google.com/spreadsheets/d/1MrNksozFNPM9V3OkOEtrN7UzdlVNriRhIdJK5w2zfhw/export?format=csv&id=1MrNksozFNPM9V3OkOEtrN7UzdlVNriRhIdJK5w2zfhw&gid=0')
        .done(loadData)
});