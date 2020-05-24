const express    = require('express'),
	  bodyParser = require('body-parser'),
	  mongoose   = require('mongoose'),
	  Event      = require('./models/event'),
	  fs         = require('fs'),
	  url        = require('url'),
	  http       = require('http'),
	  exec       = require('child_process').exec,
      spawn      = require('child_process').spawn,
	  multer     = require('multer'),
	  path       = require('path'),
	  app     	 = express();


mongoose.connect("mongodb://localhost/sdf", { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
	res.redirect("/ngo");
});

app.get("/ngo", (req, res) => {
	res.render("index");
});

app.get("/ngo/events", (req, res) => {
	Event.find()
		.then( (allEvents) => {
			res.render("events", {events: allEvents});
		})
		.catch( (err) => {
			console.log(err);
		})
});

app.post("/ngo/events", (req, res) => {
	const name = req.body.name;
	const image = req.body.image;
	const description = req.body.description;
	const img_url = image;
	const DOWNLOAD_DIR = '/workspace/SDF_Homepage/public/preview_img/' + name.split(" ")[0];
	
	const mkdir = 'mkdir -p ' + DOWNLOAD_DIR;
	const child = exec(mkdir, function(err, stdout, stderr) {
	  if (err) throw err;
	  else download_file_httpget(img_url);
	});
	
	const download_file_httpget = function(file_url) {
	  var options = {
		host: url.parse(file_url).host,
		port: 80,
		path: url.parse(file_url).pathname
	  };
		
	  const dir = '/workspace/SDF_Homepage/public/preview_img/' + name.split(" ")[0] + '/';
	
	  const file_name = url.parse(file_url).pathname.split('/').pop();
	  const file = fs.createWriteStream(dir + file_name);

	  http.get(options, (res) => {
		res.on('data', (data) => {
		  file.write(data);
		}).on('end', () => {
		  file.end();
		});
	  });
	};
	
	
	const newEvent = {name: name, image: image, description: description};
	
	Event.create(newEvent)
		.then( (newlyCreated) => {
			res.redirect("/ngo/events");
		})
		.catch( (err) => {
			console.log(err);
		})
})

app.get("/ngo/events/:id", (req, res) => {
	Event.findById(req.params.id)
		.then( (foundEvent) => {
			fs.access('./public/images/' + foundEvent.name.split(" ")[0], (error) => {
				if (error) {
					var imgFiles = [];
					res.render("show", {event: foundEvent, imgFiles: imgFiles});
				} else {
					fs.readdir('./public/images/' + foundEvent.name.split(" ")[0], (error, files) => {
						var imgFiles = [];
						files.forEach(file => {
							var imgpath = '/images/' + foundEvent.name.split(" ")[0] + '/' + file;
							imgFiles.push(imgpath);
						})  
						res.render("show", {event: foundEvent, imgFiles: imgFiles});
					})
				}
			})	
		})
		.catch( (err) => {
			console.log(err);
		})
})

app.post("/ngo/:event/:id/upload", (req, res) => {
	const storage = multer.diskStorage({
		destination: './public/images/' + req.params.event,
		filename: function(req, file, cb){
			cb(null, file.originalname);
		}
	});
	
	const upload = multer({
		storage: storage,
		fileFilter: (req, file, cb) => {
			checkFileType(file, cb);
		}
	}).array('eventImage', 20);
	
	function checkFileType(file, cb){
		const fileTypes = /jpeg|jpg|png/;
		const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = fileTypes.test(file.mimetype);
		if(mimetype && extname){
			return cb(null, true);	
		}else{
			cb("Error: Images Only");
		}
	} 
	
	upload(req, res, (err) => {
		if(err){
			console.log(err);
		}
		else{
			res.redirect("/ngo/events/" + req.params.id);
		}
	})
});

app.listen(3000, () => {
	console.log("Server Running On Port 3000");
})