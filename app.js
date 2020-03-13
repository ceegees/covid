const lat = 10.8505;
const lon = 76.2711;
var latLng = L.latLng(lat, lon);
const safeZoneDuration = 4  * 24;
var map = new L.Map('leaflet', {
    center: latLng,
    zoom: 10,
    layers: [
        new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            'attribution': 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        })
    ]
});
// L.marker(latLng).addTo(map);
// L.circle(latLng, { radius: 200 }).addTo(map);

let gDataList = [];
const markers = [];
function renderPoints() {
    let midLat = 0;
    let midLon = 0
    let total = 0;
    const secs = $("#timeline-slide").val() 
    $("#time-show").html(moment(secs * 1000).format('YYYY-MM-DD hh:mm a'));

    const filterDate = moment(secs * 1000);
    markers.forEach(function (m) {
        m.remove();
    });
    const redIcon = L.icon({
        iconUrl: 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|e85141&chf=a,s,ee00FFFF'
    });

    gDataList.forEach(function (item) {
        if (!item.locationLat || isNaN(item.locationLat) || isNaN(item.locationLon)) {
            return;
        }
        const mo1 = moment(item.timeFrom + ":00", "DD/MM/YYYY");
        const mo2 = moment(item.timeTo + ":00", "DD/MM/YYYY");

        if (!mo1.isValid() || !mo2.isValid()) {
            return;
        } 
        const diffb = filterDate.diff(mo1, 'hours');
        const diffe = filterDate.diff(mo2, 'hours'); 
        if (diffb < 0 || diffe > safeZoneDuration) {
            return;
        }
 
        const lat = parseFloat(item.locationLat);
        const lon = parseFloat(item.locationLon)
        var latlng = L.latLng(lat, lon);
        midLat = lat;
        midLon = lon;
        total = 1;
        const opacity = ((safeZoneDuration - diffe)/ (safeZoneDuration)).toFixed(4);
        const m = L.marker(latlng, {
            icon: redIcon,
            opacity:opacity
        }).addTo(map);
        const diff = diffe > 0 ?  diffe : diffb;
        m.bindPopup("<b>" + item.location_name+ ",  Potential infection "+ diff + " hours ago </b>"+
        "<br/> "+item.timeFrom +" to "+ item.timeTo);
        markers.push(m);

    });
    console.log('total points', total);
    if (total > 0) {
        midLat /= total;
        midLon /= total;
        map.setView(L.latLng(midLat, midLon));
    }

}

function w3_toggle() {
    if ( document.getElementById("appSidebar").style.display == "block") {

        document.getElementById("appSidebar").style.display = "none";
    } else {

        document.getElementById("appSidebar").style.display = "block";
    }
  }
   

$(document).ready(function () {

    const start = new Date(2020, 01, 28).getTime() / 1000;
    $("#timeline-slide").attr('min', start);
    $("#timeline-slide").attr('max', Math.floor(new Date().getTime() / 1000));
    $("#timeline-slide").attr('step', 1800);
    $("#timeline-slide").on('change', function (evt) {
        renderPoints();
    });
    $("#info-button").on('click',function(){
        $("#id01").css({display:'block'})
    })

    let playTimer = null;
    
    $("#playButton").on('click',function(){
        if (playTimer){
            clearInterval(playTimer);
            $("#playButton").html('Play');
            playTimer = null;
            return;
        }
        $("#playButton").html('Stop');
        playTimer = setInterval(function(){
            let current = parseInt($("#timeline-slide").val());
            current += (3600*2)
            $("#timeline-slide").val(current);
            renderPoints();

            if ( current > $("#timeline-slide").attr('max') ) {
                clearInterval(playTimer);
                playTimer = null;
                $("#playButton").html('Play');
            }
        },500)
    })

    $.get('https://docs.google.com/spreadsheets/d/1MrNksozFNPM9V3OkOEtrN7UzdlVNriRhIdJK5w2zfhw/export?format=csv&id=1MrNksozFNPM9V3OkOEtrN7UzdlVNriRhIdJK5w2zfhw&gid=0')
        .done(function (resp) {
            const lines = resp.split('\n');
            let header = lines.shift();
            header = header.split(',');
            gDataList = lines.map(function (line) {
                const cols = line.split(',');
                return header.reduce(function (agg, name, idx) {
                    agg[name] = cols[idx];
                    return agg;
                }, {});
            })
            console.log(gDataList);
            renderPoints();
        })
});