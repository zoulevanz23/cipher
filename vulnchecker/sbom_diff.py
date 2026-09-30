import json

def diff_sbom(prev_results: list, cur_results: list) -> dict:
    def key(r):
        pkg = r.get("package", {})
        return f"{pkg.get('name','')}@{pkg.get('version','')}"
    def name_key(r):
        return r.get("package", {}).get("name","")

    prev_map = {name_key(r): r for r in prev_results}
    cur_map = {name_key(r): r for r in cur_results}

    prev_names = set(prev_map.keys())
    cur_names = set(cur_map.keys())

    added = sorted(list(cur_names - prev_names))
    removed = sorted(list(prev_names - cur_names))

    upgraded = []
    for name in prev_names & cur_names:
        pv = prev_map[name].get("package", {}).get("version","")
        cv = cur_map[name].get("package", {}).get("version","")
        if pv != cv:
            # collect fixed CVEs if vulns reduced
            prev_vulns = {v.get("id") for v in prev_map[name].get("vulnerabilities",[])}
            cur_vulns = {v.get("id") for v in cur_map[name].get("vulnerabilities",[])}
            fixed = sorted(list(prev_vulns - cur_vulns))
            upgraded.append({"package": name, "from": pv, "to": cv, "fixed": fixed[:3]})

    return {"added": added, "removed": removed, "upgraded": upgraded, "prev_total": len(prev_results), "cur_total": len(cur_results)}
