export namespace main {
	
	export class Document {
	    path: string;
	    name: string;
	    directory: string;
	    content: string;
        modifiedAt: string;
        size: number;
        replacedPath?: string;
	
	    static createFrom(source: any = {}) {
	        return new Document(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.directory = source["directory"];
	        this.content = source["content"];
            this.modifiedAt = source["modifiedAt"];
            this.size = source["size"];
            this.replacedPath = source["replacedPath"];
	    }
	}
	export class FolderFile {
	    path: string;
	    name: string;
	    relativePath: string;
	    directory: string;
	
	    static createFrom(source: any = {}) {
	        return new FolderFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.relativePath = source["relativePath"];
	        this.directory = source["directory"];
	    }
	}
	export class FolderResult {
	    root: string;
	    name: string;
	    files: FolderFile[];
	
	    static createFrom(source: any = {}) {
	        return new FolderResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.root = source["root"];
	        this.name = source["name"];
	        this.files = this.convertValues(source["files"], FolderFile);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Preferences {
	    recentFiles: string[];
	    draftFiles?: string[];
	    lastFile?: string;
	    explorerRoot?: string;
	    language: string;
	    lastUpdateCheck?: string;
	    suppressUpdateUntil?: string;
	
	    static createFrom(source: any = {}) {
	        return new Preferences(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.recentFiles = source["recentFiles"];
	        this.draftFiles = source["draftFiles"];
	        this.lastFile = source["lastFile"];
	        this.explorerRoot = source["explorerRoot"];
	        this.language = source["language"];
	        this.lastUpdateCheck = source["lastUpdateCheck"];
	        this.suppressUpdateUntil = source["suppressUpdateUntil"];
	    }
	}
	export class UpdateInfo {
	    checked: boolean;
	    suppressed: boolean;
	    available: boolean;
	    currentVersion: string;
	    latestVersion: string;
	    releaseName: string;
	    releaseNotes: string;
	    releaseUrl: string;
	    publishedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.checked = source["checked"];
	        this.suppressed = source["suppressed"];
	        this.available = source["available"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseName = source["releaseName"];
	        this.releaseNotes = source["releaseNotes"];
	        this.releaseUrl = source["releaseUrl"];
	        this.publishedAt = source["publishedAt"];
	    }
	}

}
