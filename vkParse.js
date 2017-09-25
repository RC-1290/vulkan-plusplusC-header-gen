var xhr = new XMLHttpRequest();
var statusText = document.getElementById("statusText");
var vulkanHeader = document.getElementById("vulkanHeader");
var vulkanFunctions = document.getElementById("vulkanFunctions");

var vulkanNamespace = "Vk";
var newCodeNamespace = "CodeAnimo";
var newCodeNamespace2 = "Vulkan";

var tabSpaceWidth = 4;

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

function replaceTypes(text)
{
	var replaced = text.replace(/\bchar\b/, "s8");
	replaced = replaced.replace(/\buint32_t\b/, "u32");
	replaced = replaced.replace(/\buint64_t\b/, "u64");
	replaced = replaced.replace(/\bBool32\b/, "ub32");
	return replaced;
}

function addLineOfCode(node, code)
{
	var codeLine = document.createElement("div");
	codeLine.textContent = code;
	node.appendChild(codeLine);
}

function indentation(count)
{
	var text = "";
	
	for(var i = 0; i < count; ++i)
	{
		text += "	";
	}
	
	return text;
}

function parseXml()
{
	var vkxml = xhr.responseXML;
	var commandsNode = vkxml.getElementsByTagName("commands").item(0);
	var commands = commandsNode.getElementsByTagName("command");
	
	// Clear placeholder text:
	statusText.textContent = commands.length + " commands found: ";
	vulkanHeader.textContent = "";
	vulkanFunctions.textContent = "";
	
	// Vulkan Header:
	addLineOfCode(vulkanHeader, "#pragma once");
	addLineOfCode(vulkanHeader, "namespace " +vulkanNamespace);
	addLineOfCode(vulkanHeader, "{");
	
	var pfnDefinitions = document.createElement("div");
	var functionDefinitionsExt = document.createElement("div");
	
	addLineOfCode(pfnDefinitions, indentation(1) + "namespace PFN");
	addLineOfCode(pfnDefinitions, indentation(1) + "{");
	
	vulkanHeader.appendChild(pfnDefinitions);
	
	vulkanHeader.appendChild(functionDefinitionsExt);
	
	// Proc Address retrieval implementation:
	var functionDefinitions = document.createElement("div");
	var functionRetrieval = document.createElement("div");
	var loadIndependentCommands = document.createElement("div");
	var loadInstanceCommands = document.createElement("div");
	
	addLineOfCode(vulkanFunctions, 'extern "C" VKAPI_ATTR Vk::PFN::VoidFunction VKAPI_CALL vkGetInstanceProcAddr( Vk::Instance instance, const s8* pName );');
	vulkanFunctions.appendChild(functionDefinitions);
	vulkanFunctions.appendChild(functionRetrieval);
	addLineOfCode(functionDefinitions, "namespace " + vulkanNamespace);
	addLineOfCode(functionDefinitions, "{");
	
	addLineOfCode(functionRetrieval, "namespace " + newCodeNamespace);
	addLineOfCode(functionRetrieval, "{");
	addLineOfCode(functionRetrieval, indentation(1) +"namespace " + newCodeNamespace2);
	addLineOfCode(functionRetrieval, indentation(1) + "{");
	
	functionRetrieval.appendChild(loadIndependentCommands);
	functionRetrieval.appendChild(loadInstanceCommands);
	addLineOfCode(functionRetrieval, indentation(1) + "}");
	addLineOfCode(functionRetrieval, "}");
	
	addLineOfCode(loadIndependentCommands, indentation(2) + "bool LoadIndependentCommands()");
	addLineOfCode(loadIndependentCommands, indentation(2) + "{");
	
	addLineOfCode(loadInstanceCommands, indentation(2) + "bool LoadInstanceCommands( "+ vulkanNamespace +"::Instance instance)");
	addLineOfCode(loadInstanceCommands, indentation(2) + "{");
	
	for(var i = 0; i < commands.length; ++i)
	{
		var commandNode = commands.item(i);
		if (!commandNode){ break;}
		var protoNode = commandNode.getElementsByTagName("proto").item(0);
		if (!protoNode){ break;}
		var typeText = stripVk(protoNode.getElementsByTagName("type").item(0).textContent);
		var nameText = stripVk(protoNode.getElementsByTagName("name").item(0).textContent);
		
		// Function pointer signatures:
		var pfnEntry = document.createElement("div");
		pfnDefinitions.appendChild(pfnEntry);
		pfnEntry.textContent = indentation(2);
		pfnEntry.textContent += "typedef " + 
		typeText + "	(VKAPI_PTR *" + 
		nameText + ")(";
		
		var parameterNodes = commandNode.getElementsByTagName("param");
		
		for(var j=0; j < parameterNodes.length; ++j)
		{
			if (j != 0)
			{
				pfnEntry.textContent += ", ";
			}
			var nodes = parameterNodes.item(j).childNodes;
			
			for(var k = 0; k < nodes.length; ++k)
			{
				var parameterText = stripVk(nodes.item(k).textContent);
				parameterText = replaceTypes(parameterText);
				
				pfnEntry.textContent += parameterText;
			}
		}
		
		pfnEntry.textContent += ");"	
		
		// Function defintions:
		var fnDefExt = document.createElement("div");
		var fnDef = document.createElement("div");
		var fnLookup = document.createElement("div");
		
		functionDefinitionsExt.appendChild(fnDefExt);
		functionDefinitions.appendChild(fnDef);
		loadInstanceCommands.appendChild(fnLookup);
		
		var tabCount = Math.floor((64 - nameText.length + 3) / tabSpaceWidth);
		var definition = "PFN::" + nameText + indentation(tabCount) + nameText;
		
		fnDefExt.textContent = indentation(1) + "extern " + definition;
		fnDef.textContent = indentation(1) + definition;
		addLineOfCode(fnLookup, indentation(3) + vulkanNamespace + '::' + nameText + ' = (' + vulkanNamespace + '::PFN::' + nameText + ') vkGetInstanceProcAddr( instance, "vk' + nameText + ' );');
	}
	
	addLineOfCode(pfnDefinitions, indentation(1) + "}");
	addLineOfCode(functionDefinitionsExt, "}");
	addLineOfCode(functionDefinitions, "}");
	addLineOfCode(loadIndependentCommands, indentation(2) + "}");
	addLineOfCode(loadInstanceCommands, indentation(2) + "}");
	
}

function onXhrLoad()
{
	if (xhr.readyState === 4)
	{
		if (xhr.status === 200)
		{
			parseXml();	
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