var colors = [ "#EEF", "#FEE", "#EFE"]
var strongcolors = ["#AAF", "#FAA", "#AFA", "#55F", "#F55", "#5F5" ];
var darkcolors = ["#A00", "#0A0", "#00A", "#AA0", "#0AA", "#A0A"];
var wordThreshold = 500;
var ftypes = ["Polarity", "RJType", "Gender"];
var colorIndex = 0;

function loadChart(data) {
	$("#tabs > ul").append("<li><a href=\"#hc\">Figure Presence Chart</a></li>");
	$("#tabs").append("<div class=\"hc\" id=\"hc\"></div>");
	var segments;
	if ("scs" in data) {
		segments = data["scs"];
	} else /* if ("seg1" in data["segments"]) */{
		segments = data["acts"];
	}
	var end = 0;
	var pb = segments.sort(function(a,b) {
		return a["begin"]-b["begin"];
	}).map(function(cur, i, _) {
		if (parseInt(cur["end"]) > end) end = parseInt(cur["end"]);
		return {
			from : parseInt(cur["begin"]),
			to : parseInt(cur["end"]),
			color : colors[i % 3],
			label : {
				text : cur["head"],
				rotation : 270,
				align : "center",
				verticalAlign : "bottom",
				y : 30
			}
		}
	});
	var figures = data["figures"].map(function(_,ind,_) {return ind});
	var figureNames = [];
	var series = figures.sort(function(a,b) {
		return data["figures"][a]["NumberOfWords"] - data["figures"][b]["NumberOfWords"];
	}).map(function(cur2, index, _) {
		var cur = data["figures"][cur2];
		figureNames.push(cur["txt"]);
		// console.log(cur);
		var utterances = [];
		if ("utt" in cur) 
			for (var i = 0; i < cur["utt"].length; i++) {
				var uttObj = data["utt"][cur["utt"][i]];
				if (typeof(uttObj) == "undefined")
					continue;
				if ("s" in uttObj)
					for (sp of uttObj["s"]) {
						utterances.push({
							x:sp["begin"],
							y:index,
							name:sp["txt"]
						});
						utterances.push({
							x:sp["end"],
							y:index,
							name:sp["txt"]
						});
					}
				utterances.push(null);
			}
		var r = {
			name:cur["Reference"],
			data:utterances,
			lineWidth:3,
			visible:(cur["NumberOfWords"]>wordThreshold),
			turboThreshold:0
		};
		// console.log(r);
		return r;
	});

	$("#hc").highcharts(
					{
						legend:{
							y:200
						},
						title : null,
						chart : {
							type : 'line',
							zoomType : 'xy',
							spacingBottom:230
						},
						xAxis : {
							plotBands: pb,
							min: 0,
							max: end+1,
							labels: {
								enabled: false
							}
						},
						yAxis : {
							//min: 0,
							max: figures.length-1,
							labels: {
								enabled:true
							},
							title:null,
							categories:figureNames
						},
						plotOptions : {
							series : {
								lineWidth : 1
							// connectNulls: false // by default
							}
						},
						tooltip : {
							crosshairs : true,
							headerFormat : "",
							useHTML : true,
							pointFormat : "<div style=\"width:200px;max-width:300px; white-space:normal\"><span style=\"color:{point.color};font-weight:bold;\">{series.name}</span>: {point.name}</div>"
						},
						series: series
					});
}

function loadTable(data) {
	var wsize = 1000;
	
	$("#tabs > ul")
			.append("<li><a href=\"#speech\">Figure Speech Table</a></li>");
	$("#tabs")
			.append("<div id=\"speech\"><h3>Chart</h3><div class=\"chart hc\"></div><h3>Table</h3><div><table width=\"100%\"></table></div></div>");

	

	var maxValues = {
		NumberOfWords:0,
		NumberOfUtterances:0,
		UtteranceLengthArithmeticMean:0,
		TypeTokenRatio100:0,
	};

	var mydata = data["figures"].map(function(cur, ind, arr) {
		for (si in maxValues) {
			var v = cur[si];
			if (cur["NumberOfWords"]>wsize && v > maxValues[si])
				maxValues[si] = v;
		}
	});
	console.log(mydata);
	$("#speech .chart").highcharts({
		title:null,
		chart: {
			type: "column"
		},
		xAxis: {
			categories: Object.keys(maxValues)
		},
		yAxis:{
			min:0,
			max:1
		},
		series: data["figures"].map(function (cur, ind, _) {
			return {
				name: cur["Reference"],
				data: [
					cur["NumberOfWords"]/maxValues["NumberOfWords"],
					cur["NumberOfUtterances"]/maxValues["NumberOfUtterances"],
					cur["UtteranceLengthArithmeticMean"]/maxValues["UtteranceLengthArithmeticMean"],
					(cur["NumberOfWords"]>wsize?cur["TypeTokenRatio100"]/maxValues["TypeTokenRatio100"]:0)
				]
			};
		})
	});

	$("#speech table").DataTable({
		data: data["figures"],
		columns: [
			{ title : "Figure",data:"Reference" }, 
			{ title : "Words",data:"NumberOfWords" },
			{ title : "Utterances",data:"NumberOfUtterances" },
			{ title : "Mean Utt. Length",data:"UtteranceLengthArithmeticMean" },
			{ title : "Type Token Ratio",data:"TypeTokenRatio100" }
		],
		pageLength:100,
		retrieve: true
	});
	
	$("#speech").accordion({
		heightStyle: "content"
	});
}

function loadFieldTable(data) {
	$("#tabs > ul").append("<li><a href=\"#fields\">Figures and Semantic Fields</a></li>");
	$("#tabs").append("<div id=\"fields\"><h3>Chart</h3><div class=\"chart hc\"></div><h3>Table</h3><div><table width=\"100%\"></table></div></div>");
	
	
	var tableData = data["figures"].filter(function(cur,_,_) {
		return ("utt" in cur);
	}).map(function(cur, ind, arr) {
		var sum = {};
		var arr = [];
		for (field of Object.keys(data.fields).sort()) {
			sum[field] = 0;
		}
		for (var i = 0; i < cur["utt"].length; i++) {
			var currentUtterance = data["utt"][cur["utt"][i]]
			if ("s" in currentUtterance)
			for (speech of currentUtterance.s) {
				if ("fields" in speech) {
					for (fname of speech["fields"]) {
						sum[fname]++;
					}
				}
			}
		}
		for (field of Object.keys(data.fields).sort()) {
			arr.push((sum[field] / data["fields"][field]["Length"])/cur["NumberOfWords"]);
		}
		return [ cur['Reference'] ].concat(arr);
	});
	var columns = [ {
		title: "Figure"
	} ].concat(Object.keys(data["fields"]).map(function(cur, _, _) {
		return {title:cur,width:"10%"};
	}));
		
		
	var series = data["figures"].filter(function(cur, _, _) {
		return true;
	}).map(function(cur, ind, arr) {
			var sum = {};
			var arr = [];
			for (field of Object.keys(data.fields).sort()) {
				sum[field] = 0;
			}
			if ("utt" in cur) {
				for (var i = 0; i < cur["utt"].length; i++) {
					var currentUtterance = data["utt"][cur["utt"][i]]
					if ("s" in currentUtterance)
					for (speech of currentUtterance.s) {
						if ("fields" in speech) {
							for (fname of speech["fields"]) {
								sum[fname]++;
							}
						}
					}
				}
			}
			for (field of Object.keys(data.fields).sort()) {
				arr.push(1000*(sum[field] / data["fields"][field]["Length"])/cur["NumberOfWords"]);
			}
			return {
				name:cur["Reference"],
				data:arr,
				pointPlacement: 'on',
				lineWidth:2,
				visible:(cur["NumberOfWords"]>wordThreshold)
			};
		});
	$("#fields .chart").highcharts({
		chart: {
			polar: true,
			type: 'line'
		},
		colors: darkcolors,
		title: {
			text:null
		},
		pane:{
			size:'90%'
		},
		xAxis:{
			categories: Object.keys(data["fields"]).sort(),
			lineWidth: 0
		},
		yAxis:{
			gridLineInterpolation: 'polygon'
		},
		tooltip: {enabled:false},
		series: series
	});
		
	$("#fields table").DataTable({
		retrieve: true,
		data : tableData,
		columns : columns,
		pageLength:100
	});
	
	$("#tabs #fields").accordion({
		heightStyle: "content"
	});
	
}

function loadText(data) {
	console.log(data);
	$("#tabs > ul").append(
			"<li><a href=\"#text\">Text</a></li>");
	$("#tabs").append("<div id=\"text\"></div>");
	
	$("#text").append("<div class=\"toccontainer\"><p>Table of Contents</p><ul class=\"toc\"></ul><p>Dramatis Personae</p><ul class=\"dramatispersonae\"></ul></div>");
	
	for (var fIndex = 0; fIndex < data["figures"].length; fIndex++) {
		var figure = data["figures"][fIndex];
		$("ul.dramatispersonae").append("<li class=\"f"+fIndex+"\"><input type=\"checkbox\" name=\"highligh\" value=\"f"+fIndex+"\"\"/>"+figure["Reference"]+"</li>");
	}
	$("ul.dramatispersonae input[type='checkbox']").change(function(event) {
		var val = $(event.target).val();
		if ($(event.target).is(":checked"))
			$("."+val).css("background-color",strongcolors[(colorIndex++)%strongcolors.length]);
		else 
			$("."+val).css("background-color","");
	});
	
	var actIndex = 1;
	var segment = document.createElement("div");
	for (act of data["acts"].sort(function(a,b) {return parseInt(a["begin"])-parseInt(b["begin"])})) {
		console.log(act);
		segment = document.createElement("div");
		var anchor = "act"+actIndex;
		var actToc = document.createElement("ul");
		if ("head" in act) {
			$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+act["head"]+"</a></li>");
			$(segment).append("<div class=\"actheading\"><a name=\"#"+anchor+"\">"+act["head"]+"</a></div>");
			actIndex++;
		} else {
			$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+actIndex+". Act</a></li>");
			$(segment).append("<div class=\"actheading\"><a name=\"#"+anchor+"\">"+(actIndex++)+". Act</a></div>");
		}
		
		var sceneIndex = 1;
		var scenes = data["scs"].filter(function(a) {
			return parseInt(a["begin"]) >= parseInt(act["begin"]) && parseInt(a["end"]) <= parseInt(act["end"]);
		}).sort(function (a,b) {return parseInt(a["begin"])-parseInt(b["begin"])});
		// console.log(scenes);
		for (scene of scenes) {
			var sceneElement = document.createElement("div");
			var anchor = "act"+actIndex+"_scene"+sceneIndex;
			if ("head" in scene) {
				$(actToc).append("<li><a href=\"#"+anchor+"\">"+scene["head"]+"</a></li>");
				$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+scene["head"]+"</a></div>");
				sceneIndex++;
			} else {
				$(actToc).append("<li><a href=\"#"+anchor+"\">"+sceneIndex+". Scene</a></li>");
				$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+(sceneIndex++)+". Scene</a></div>");
			}
			for (u of data["utt"].filter(function (a) {
				return a["begin"] >= scene["begin"] && a["end"] <= scene["end"];
			})) {
				var figure = data["figures"][u["f"]];
				var utteranceElement = document.createElement("div");
				$(utteranceElement).addClass("utterance");
				$(utteranceElement).attr("data-begin", u["begin"]);
				$(utteranceElement).attr("data-end", u["end"]);
				$(utteranceElement).append("<div class=\"speaker f"+u["f"]+"\">"+figure["Reference"]+"</div>");
				if ("s" in u)
				for (s of u["s"]) {
					$(utteranceElement).append("<div class=\"speech\">"+s["txt"]+"</div>");
				}
				$(sceneElement).append(utteranceElement);
			}
			$(segment).append(sceneElement);
			$("#text ul.toc").append(actToc);
		}
		$("#text").append(segment);
		$(".toccontainer").accordion({header:"p",heightStyle:"content",collapsible:true});
	}
	
}

function loadNetwork(data) {
	$("#tabs > ul").append(
			"<li><a href=\"#mentionnetwork\">Mention Network</a></li>");

	$("#tabs").append(
			"<div id=\"mentionnetwork\" style=\"height:400px;\"></div>");

	var width = 960, height = 500;
	var svg = d3.select("#mentionnetwork").append("svg").attr("width", width)
			.attr("height", height);
	svg.append("defs").selectAll("marker").data(
			[ "suit", "licensing", "resolved" ]).enter().append("marker").attr(
			"id", function(d) {
				return d;
			}).attr("viewBox", "0 -5 10 10").attr("refX", 25).attr("refY", 0)
			.attr("markerWidth", 6).attr("markerHeight", 6).attr("orient",
					"auto").append("path").attr("d",
					"M0,-5L10,0L0,5 L10,0 L0, -5").style("stroke", "#000")
			.style("opacity", "1");
	var force = d3.layout.force().size([ width, height ]).charge(-400)
			.linkDistance(40);

	force.drag().on("dragstart", dragstart);

	force.nodes(data["network"]["nodes"]).links(data["network"]["links"])
			.start();

	var link = svg.selectAll(".link").data(data["network"]["links"]).enter()
			.append("line").attr("class", "link").attr("marker-end",
					"url(#suit)");

	var node = svg.selectAll(".node").data(data["network"]["nodes"]).enter()
			.append("g").attr("class", "node").call(force.drag);

	node.append("circle").attr("r", 12).on("dblclick", dblclick);

	node.append("text").attr("dx", 12).attr("dy", ".35em").style("font-weight",
			"normal").text(function(d) {
		return d.label
	});

	force.on("tick", function() {
		link.attr("x1", function(d) {
			return d.source.x;
		}).attr("y1", function(d) {
			return d.source.y;
		}).attr("x2", function(d) {
			return d.target.x;
		}).attr("y2", function(d) {
			return d.target.y;
		});

		node.attr("transform", function(d) {
			return "translate(" + d.x + "," + d.y + ")";
		});
	});
}

function load() {
	var mydata = data[parseInt($("#docselect").val())];
	
	var title = mydata["meta"]["ReferenceDate"]+": "+mydata["meta"]["authors"][0]["Name"]+ " - " + mydata["meta"]["documentTitle"] + ("translators" in mydata["meta"]?" (trsl. "+mydata["meta"]["translators"][0]["Name"]+")":""); 
	document.title = title;
	$("#title").text("Drama View");
	$("#title").after("<h2>"+title+"</h2>");
	loadText(mydata);
	loadChart(mydata);
	loadTable(mydata);
	if ("network" in mydata)
		loadNetwork(mydata);
	if ("fields" in mydata) {
		loadFieldTable(mydata);
	}
	$("#tabs").tabs();
}

function clean() {
	try {
		$("#fields table").DataTable().destroy();
		$("#speech table").DataTable().destroy();
		$("#tabs #fields").accordion("destroy");
		$("#tabs").tabs("destroy");
	} catch (err) {
	
	}
	$("#content h2").remove();
	$("#tabs").empty();
	$("#tabs").append("<ul></ul>");
}

function init(data) {
	data = data.sort(function (a,b) {
		return a["meta"]["ReferenceDate"] - b["meta"]["ReferenceDate"];
	});
	var ftypes = {};
	var wordfields = {};
	for (var i = 0; i < data.length; i++) {
		$("#docselect").append("<option value=\""+i+"\">"+data[i]["meta"]["DisplayId"]+"</option>");
		for (var ftype in data[i]["ftypes"]) {
			if (!ftypes.hasOwnProperty(ftype))
				ftypes[ftype] = new Object();
			for (var fvalue in data[i]["ftypes"][ftype]) {
				ftypes[ftype][fvalue] = 1;
			}
		}
		for (var wf in data[i]["fields"]){
			wordfields[wf] = 1;
		}
	}
	// console.log(ftypes);
	$("#docselect").change(function(event) {
		clean();
		load();
	});
	for (ftype in ftypes) {
		var og = document.createElement("optgroup");
		$(og).attr("label", ftype);
		for (fvalue in ftypes[ftype])
			$(og).append("<option value=\""+ftype+"."+fvalue+"\">"+fvalue+"</option>");
		$("#figuretype").append(og);
	}
	for (wf in wordfields) {
		$("#wordfield").append("<input type=\"checkbox\" name=\"field\" value=\""+wf+"\" />"+wf+"<br/>");
	}
	
	load();
}

function dblclick(d) {
	d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
	d3.select(this).classed("fixed", d.fixed = true);
}


function load_aggregated_view(target, data, words, figureclass, figurevalue, ftype, fields) {
	$("#title").text("Corpus Overview");
	var docs = [];
	var sp = [];
	for (var i = 0; i < data.length; i++) {
		try {
			if (data[i]["ftypes"][figureclass][figurevalue].length>0) {
				docs.push(data[i]);
			}
		} catch (err) {
			// console.error(err);
		}
	}
	docs = docs.sort(function(a,b) {
		return parseInt(a.meta.ReferenceDate) - parseInt(b.meta.ReferenceDate);
	});
	// console.log(docs);
	var series = words.map(function(cur, index, _) {
		var d = docs.map(function(cur2, _, _) {
			var figureIndices = cur2["ftypes"][figureclass][figurevalue];
			var occ = 0;
			var total = 0;
			for (f of figureIndices) {
				total += parseInt(cur2["figures"][f]["NumberOfWords"]);
				try {
					occ += parseInt(cur2["figures"][f]["freq"][cur]["c"]);
				} catch (err) {
					// console.error(err);
				}
			}
			//console.log(total);
			var yvalue = 0;
			try {
				if (total > 0) 
					yvalue = occ / total;
				else yvalue = 0;
			} catch (err) {
				// console.err;
			} finally {
			};
			// var ret = parseInt(cur2["meta"]["ReferenceDate"]);
			return yvalue; // ret;
		});
		// console.log(d);
		return {
			lineWidth:1,
			marker:{radius:4},
			name : cur,
			data : d,
			visible: ($("#everythingHidden:checked").length == 0)
		};
	}).concat(
		fields.map(function(cur,_, _) {
			var d = docs.map(function(cur2, _, _) {
				var figureIndices = cur2["ftypes"][figureclass][figurevalue];
				var occ = 0;
				var total = 0;
				for (var f of figureIndices) {
					total += parseInt(cur2["figures"][f]["NumberOfWords"]);
					if ("utt" in cur2["figures"][f])
					for (var u of cur2["figures"][f]["utt"]) {
						if (u in cur2["utt"] && "s" in cur2["utt"][u])
						for (var s of cur2["utt"][u]["s"]) {
							if ("fields" in s)
							occ += s["fields"].filter(function(a) {
								return a === cur;
							}).length;
						}
					}
				}
				if (total == 0)
					return 0;
				return 93*(occ / total) / cur2["fields"][cur]["Length"];
			});
			return {
				lineWidth:1,
				marker:{radius:4},
				name : cur,
				data : d,
				visible: ($("#everythingHidden:checked").length == 0)
			}; 
		}));
	// console.log(series);
	$(target).highcharts(
		{
			chart: {
				height:"600",
				type: "line"
			},
			title : {
				text: figureclass+": "+figurevalue
			},
			series: series,
			plotOptions: {
				line: {
					marker: {
						enabled: true
					}
				}
			},
			tooltip:{
				headerFormat:"<small>{point.key}</small><br/>"
			},
			xAxis: {
				categories: docs.map(function(cur, _, _) {
					return cur["meta"]["ReferenceDate"]+" "+cur["meta"]["authors"][0]["Name"] + ": "+cur["meta"]["documentTitle"]+("transl" in cur["meta"]?" (transl.: "+cur["meta"]["translators"][0]["Name"]+")":"");
				})
			}
		}
	);
}

function draw () {
	clean();
	var numWords = $("input#maxlemma").val();
	var words = {};
	var fields = {};
	$("input[name='field']:checked").each(function(index, element) {
		fields[$(element).val()] = 1;
	});
	
	
	var ft = $("#figuretype").val().split(".");
	var vt = $("#valuetype").val();
	if ($("#words_entered:checked").length>0) {
		for (w of $("#words").val().split("\n")) {
			words[w] = 1;
		}
	}
	var posTags = [];
	var useEveryPosTag = $("#words_mf_everything:checked").length>0;
	if ($("#words_mf_nouns:checked").length>0) {
		posTags.push("NN");
	}
	if ($("#words_mf_verbs:checked").length>0) {
		posTags.push("VV");
	}
	if ($("#words_mf_adjectives:checked").length>0) {
		posTags.push("ADJ");
	}
	if ($("#words_most_frequent:checked").length>0) {
		for (doc of data) {
			var array = new Object();
			try {
				// console.log(ft);
				for (figIndex of doc["ftypes"][ft[0]][ft[1]]) {
					var figure = doc["figures"][figIndex];
					for (word in figure["freq"]) {
						var p = figure["freq"][word]["pos"]
						if (useEveryPosTag || posTags.includes(p))
							array[word] = figure["freq"][word]["c"];
					}
				}
				var mfl = Object.keys(array).sort(function (a,b) {
					return array[b] - array[a];
				});
				for (var i = 0; i < numWords; i++) {
					words[mfl[i]] = 1;
				}
				// console.log(mfl);
			} catch (err) {	
				// console.error(err);
			}
		}
	}
	// console.log(words);
	load_aggregated_view("#tabs", data, Object.keys(words), ft[0], ft[1], vt, Object.keys(fields));
}