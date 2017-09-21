var xhr = new XMLHttpRequest();
var statusText = document.getElementById("statusText");
var resultText = document.getElementById("resultText");

function stripVk(text)
{
	if (text.startsWith("Vk") || text.startsWith("vk"))
	{
		return text.slice(2);
	}
	else 
	{
		return text;
	}
}

function onXhrLoad()
{
	if (xhr.readyState === 4)
	{
		if (xhr.status === 200)
		{
			
			var vkxml = xhr.responseXML;
			var commands = vkxml.getElementsByTagName("command");
			
			statusText.textContent = commands.length + " commands found: ";
			resultText.textContent = "";
			for(var i = 0; i < commands.length; ++i)
			{
				var commandNode = commands.item(i);
				if (!commandNode){ break;}
				var protoNode = commandNode.getElementsByTagName("proto").item(0);
				if (!protoNode){ break;}
				var typeNode = protoNode.getElementsByTagName("type").item(0);
				var nameNode = protoNode.getElementsByTagName("name").item(0);
				
				var typeText = stripVk(typeNode.textContent);
				var nameText = stripVk(nameNode.textContent);
				
				var entry = document.createElement("p");
				entry.textContent = "typedef " +  typeText + " " + nameText;
				
				resultText.appendChild(entry);
			}
		}
		else 
		{
			console.error("xhr failed: " + xhr.statusText);
		}
	}
}


var async = true;
xhr.addEventListener("load", onXhrLoad);
xhr.open("GET", "vk.xml", async);
xhr.send();