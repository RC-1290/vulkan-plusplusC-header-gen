// Vulkan xml parsers, header generator.
// Written by Laurens Mathot, Code Animo.

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
	if (text.startsWith("VK_"))
	{
		return text.slice(3);
	}
	else if (text.startsWith("Vk") || text.startsWith("vk"))
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

function padTabs(text, length)
{
	var tabCount = Math.floor((length - text.length) / tabSpaceWidth);
	return text + indentation(tabCount);
}

function parseXml()
{
	var vkxml = xhr.responseXML;
	
	var typesNode = vkxml.getElementsByTagName("types").item(0);
	var types = typesNode.children
	
	var commandsNode = vkxml.getElementsByTagName("commands").item(0);
	var commands = commandsNode.getElementsByTagName("command");
	
	
	// Clear placeholder text:
	vulkanHeader.textContent = "";
	vulkanFunctions.textContent = "";
	
	// Vulkan Header:
	addLineOfCode(vulkanHeader, "// This header is generated from the Khronos Vulkan XML API Registry,");
	addLineOfCode(vulkanHeader, "// https://github.com/KhronosGroup/Vulkan-Docs/blob/1.0/src/spec/vk.xml");
	addLineOfCode(vulkanHeader, "// which is Licensed under the Apache License, Version 2.0 ");
	addLineOfCode(vulkanHeader, "// The custom header generator was written by Laurens Mathot (@RC_1290).");
	addLineOfCode(vulkanHeader, "#pragma once");
	addLineOfCode(vulkanHeader, indentation(1));
	addLineOfCode(vulkanHeader, "namespace " +vulkanNamespace);
	addLineOfCode(vulkanHeader, "{");
	
	var handleDefinitions = document.createElement("div");
	var enumDefinitions = document.createElement("div");
	var funcPointerDefinitions = document.createElement("div");
	var structDefinitions = document.createElement("div");
	
	var pfnDefinitions = document.createElement("div");
	var functionDefinitionsExt = document.createElement("div");
	
	addLineOfCode(pfnDefinitions, indentation(1));
	addLineOfCode(pfnDefinitions, indentation(1) + "namespace PFN");
	addLineOfCode(pfnDefinitions, indentation(1) + "{");
	
	vulkanHeader.appendChild(handleDefinitions);
	vulkanHeader.appendChild(enumDefinitions);
	vulkanHeader.appendChild(funcPointerDefinitions);
	vulkanHeader.appendChild(structDefinitions);
	vulkanHeader.appendChild(pfnDefinitions);
	vulkanHeader.appendChild(functionDefinitionsExt);
	
	// Handles:
	addLineOfCode(handleDefinitions, indentation(1) + "//handles: " );
	for(var i = 0; i < types.length; ++i)
	{
		var typeNode = types.item(i);
		var category = typeNode.getAttribute("category");
		
		if (category == "handle")
		{
			var name = stripVk( typeNode.getElementsByTagName("name").item(0).textContent );
			addLineOfCode(handleDefinitions, padTabs( indentation(1) + "typedef struct " + name + "_T*", 60 ) + name + ";");
		}
	}
	
	// Proc Address retrieval implementation:
	var functionDefinitions = document.createElement("div");
	var functionRetrieval = document.createElement("div");
	var loadIndependentCommands = document.createElement("div");
	var loadInstanceCommands = document.createElement("div");
	
	addLineOfCode(vulkanFunctions, 'extern "C" VKAPI_ATTR Vk::PFN::VoidFunction VKAPI_CALL vkGetInstanceProcAddr( Vk::Instance instance, const s8* pName );');
	addLineOfCode(vulkanFunctions, "	");
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
	
	// Parse commands
	for(var i = 0; i < commands.length; ++i)
	{
		var commandNode = commands.item(i);
		if (!commandNode){ break;}
		var protoNode = commandNode.getElementsByTagName("proto").item(0);
		if (!protoNode){ break;}
		var typeText = stripVk(protoNode.getElementsByTagName("type").item(0).textContent);
		var nameText = stripVk(protoNode.getElementsByTagName("name").item(0).textContent);
		
		if (nameText == "GetDeviceProcAddr" || nameText == "GetInstanceProcAddr"){ continue; }
		
		// Function pointer signatures (PFN):
		var pfnEntry = document.createElement("div");
		pfnDefinitions.appendChild(pfnEntry);
		pfnEntry.textContent = indentation(2);
		pfnEntry.textContent += "typedef " + 
		typeText + "		(VKAPI_PTR *" + 
		nameText + ")(";
		
		var commandChildren = commandNode.children;
		var firstParameter = true;
		
		for(var j=0; j < commandChildren.length; ++j)
		{
			var commandChild = commandChildren.item(j);
			if (commandChild.tagName != "param")
			{
				continue;
			}
			
			if (firstParameter) { firstParameter = false; }
			else { pfnEntry.textContent += ", "; }
			
			var nodes = commandChild.childNodes;
			
			for(var k = 0; k < nodes.length; ++k)
			{
				var node = nodes.item(k);
				
				var parameterText = stripVk(node.textContent);
				parameterText = replaceTypes(parameterText);
				
				pfnEntry.textContent += parameterText;
			}
		}
		
		pfnEntry.textContent += ");"	
		
		// Function defintions:
		var fnDefExt = document.createElement("div");
		var fnDef = document.createElement("div");
		
		functionDefinitionsExt.appendChild(fnDefExt);
		functionDefinitions.appendChild(fnDef);
		
		fnDefExt.textContent = indentation(1) + padTabs("extern PFN::" + nameText, 67) + nameText + ";";
		fnDef.textContent = indentation(1) + padTabs(" PFN::" + nameText, 67) + nameText + ";";;
		
		if (nameText == "EnumerateInstanceLayerProperties" || nameText == "EnumerateInstanceExtensionProperties" || nameText == "CreateInstance")
		{
			addLineOfCode(loadIndependentCommands, indentation(3) + vulkanNamespace + '::' + nameText + ' = (' + vulkanNamespace + '::PFN::' + nameText + ') vkGetInstanceProcAddr( nullptr, "vk' + nameText + '" );');
			addLineOfCode(loadIndependentCommands, indentation(3) + 'if(!' + vulkanNamespace + '::' +nameText + ') { return false; }');
		}
		else 
		{
			addLineOfCode(loadInstanceCommands, indentation(3) + vulkanNamespace + '::' + nameText + ' = (' + vulkanNamespace + '::PFN::' + nameText + ') vkGetInstanceProcAddr( instance, "vk' + nameText + '" );');
			addLineOfCode(loadInstanceCommands, indentation(3) + 'if(!' + vulkanNamespace + '::' +nameText + ') { return false; }');
		}
	}
	
	// closing braces:
	addLineOfCode(pfnDefinitions, indentation(1) + "}");
	addLineOfCode(functionDefinitionsExt, "}");
	addLineOfCode(functionDefinitions, "}");
	addLineOfCode(loadIndependentCommands, indentation(3) + "return true;");
	addLineOfCode(loadIndependentCommands, indentation(2) + "}");
	addLineOfCode(loadInstanceCommands, indentation(3) + "return true;");
	addLineOfCode(loadInstanceCommands, indentation(2) + "}");
	
	statusText.textContent = "Parsing complete";
}

function onXhrLoad()
{
	if (xhr.readyState === 4)
	{
		if (xhr.status === 200)
		{
			statusText.textContent = "parsing xml...";
			parseXml();	
		}
		else 
		{
			statusText.textContent = "xhr failed: " + xhr.statusText;
			console.error("xhr failed: " + xhr.statusText);
		}
	}
}

statusText.textContent = "Trying to open vk.xml";
var async = true;
xhr.addEventListener("load", onXhrLoad);
xhr.open("GET", "vk.xml", async);
xhr.send();