// bun server file to only allow local requests
// and proxies ollama calls

import { serve, file } from "bun";
import net from "net";

const folderToServe = "./";

const OriginalNetConnect = net.connect;

net.connect = (options, connectionListener) => {
	const hostname = options.host || options.hostname;

	if(hostname !== "127.0.0.1" && hostname !== "localhost"){
		console.error(`Outbound connection to ${hostname} is blocked by policy.`);
		return;
	}
	return OriginalNetConnect(options, connectionListener);
};

serve({
	hostname: "127.0.0.1", 
	port: 3300,
	async fetch(req){
		const url = new URL(req.url);
		
		if(url.pathname === "/v1/models" || url.pathname === "/v1/chat/completions"){
			const ollamaBaseUrl = "http://localhost:11434";
			const ollamaTarget = `${ollamaBaseUrl}${url.pathname}`;
			console.log(`Proxying request to: ${ollamaTarget}`);
			
			try{
				return fetch(ollamaTarget, req); 
			}catch(e){
				console.error("Ollama Proxy Error:", e);
				return new Response("Ollama service unavailable on 11434. Did you restart it on the correct port?", { status: 503 });
			}

		}else{
			const path = url.pathname === "/" ? "index.html" : url.pathname;
			
			const filePath = `${folderToServe}${path}`;
			const servedFile = file(filePath);

			if(await servedFile.exists()){
				return new Response(servedFile);
			}
			return new Response("Not Found", { status: 404 });
		}
	}
});

console.log(`Server Running at http://127.0.0.1:3300`);
console.log(`Proxies Ollama to: http://localhost:11434`);
