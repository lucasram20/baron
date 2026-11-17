use serde_json::{Map, Number, Value};
use std::collections::HashMap;

const MAX_TOON_DEPTH: usize = 32;

/// Parses an OP.GG MCP tool response (either standard JSON or OP.GG class-notation TOON text) into JSON.
pub(crate) fn parse_toon_or_json(raw: &str) -> Result<Value, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Empty OP.GG MCP response".to_string());
    }
    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        return serde_json::from_str(trimmed)
            .map_err(|e| format!("Invalid OP.GG JSON payload: {e}"));
    }

    let mut schemas: HashMap<&str, Vec<&str>> = HashMap::new();
    let mut expr_start: Option<usize> = None;
    let mut offset = 0usize;

    for line in raw.split_inclusive('\n') {
        let stripped = line.trim();
        if let Some(rest) = stripped.strip_prefix("class ") {
            if let Some((name, fields_str)) = rest.split_once(':') {
                let fields: Vec<&str> = fields_str
                    .split(',')
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .collect();
                schemas.insert(name.trim(), fields);
            }
        } else if !stripped.is_empty() && expr_start.is_none() {
            expr_start = Some(offset);
            break;
        }
        offset += line.len();
    }

    let expr_str = expr_start
        .map(|pos| raw[pos..].trim())
        .ok_or_else(|| "Missing expression body in OP.GG response".to_string())?;

    let mut parser = ToonParser::new(expr_str, &schemas);
    let val = parser.parse_value(0)?;
    parser.skip_ws();
    if !parser.is_eof() {
        return Err("Unexpected trailing tokens in OP.GG response".to_string());
    }
    Ok(val)
}

struct ToonParser<'a> {
    bytes: &'a [u8],
    src: &'a str,
    pos: usize,
    schemas: &'a HashMap<&'a str, Vec<&'a str>>,
}

impl<'a> ToonParser<'a> {
    fn new(src: &'a str, schemas: &'a HashMap<&'a str, Vec<&'a str>>) -> Self {
        Self {
            bytes: src.as_bytes(),
            src,
            pos: 0,
            schemas,
        }
    }

    fn is_eof(&self) -> bool {
        self.pos >= self.bytes.len()
    }

    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn skip_ws(&mut self) {
        while let Some(b) = self.peek() {
            if b.is_ascii_whitespace() {
                self.pos += 1;
            } else {
                break;
            }
        }
    }

    fn parse_value(&mut self, depth: usize) -> Result<Value, String> {
        if depth > MAX_TOON_DEPTH {
            return Err("OP.GG TOON nesting limit exceeded".to_string());
        }
        self.skip_ws();
        let b = self
            .peek()
            .ok_or_else(|| "Unexpected end of OP.GG TOON payload".to_string())?;

        match b {
            b'"' => self.parse_string().map(Value::String),
            b'[' => self.parse_array(depth),
            b'-' | b'0'..=b'9' => self.parse_number(),
            b'a'..=b'z' | b'A'..=b'Z' | b'_' => self.parse_ident_or_constructor(depth),
            _ => Err(format!(
                "Unexpected byte '{}' at position {}",
                b as char, self.pos
            )),
        }
    }

    fn parse_string(&mut self) -> Result<String, String> {
        let start = self.pos;
        self.pos += 1; // opening '"'
        let mut escaped = false;
        while let Some(b) = self.peek() {
            self.pos += 1;
            if escaped {
                escaped = false;
                continue;
            }
            if b == b'\\' {
                escaped = true;
            } else if b == b'"' {
                let slice = &self.src[start..self.pos];
                return serde_json::from_str::<String>(slice)
                    .map_err(|e| format!("Invalid string token: {e}"));
            }
        }
        Err("Unterminated string literal in OP.GG response".to_string())
    }

    fn parse_number(&mut self) -> Result<Value, String> {
        let start = self.pos;
        if self.peek() == Some(b'-') {
            self.pos += 1;
        }
        while let Some(b) = self.peek() {
            if b.is_ascii_digit() || matches!(b, b'.' | b'e' | b'E' | b'+' | b'-') {
                self.pos += 1;
            } else {
                break;
            }
        }
        let raw = &self.src[start..self.pos];
        if raw.contains('.') || raw.contains('e') || raw.contains('E') {
            let f: f64 = raw
                .parse()
                .map_err(|_| format!("Invalid float token: {raw}"))?;
            Number::from_f64(f)
                .map(Value::Number)
                .ok_or_else(|| format!("Non-finite float token: {raw}"))
        } else if let Ok(i) = raw.parse::<i64>() {
            Ok(Value::Number(i.into()))
        } else if let Ok(u) = raw.parse::<u64>() {
            Ok(Value::Number(u.into()))
        } else {
            Err(format!("Invalid integer token: {raw}"))
        }
    }

    fn parse_array(&mut self, depth: usize) -> Result<Value, String> {
        self.pos += 1; // '['
        let mut items = Vec::new();
        loop {
            self.skip_ws();
            if self.peek() == Some(b']') {
                self.pos += 1;
                return Ok(Value::Array(items));
            }
            items.push(self.parse_value(depth + 1)?);
            self.skip_ws();
            match self.peek() {
                Some(b',') => self.pos += 1,
                Some(b']') => {
                    self.pos += 1;
                    return Ok(Value::Array(items));
                }
                _ => return Err(format!("Expected ',' or ']' at position {}", self.pos)),
            }
        }
    }

    fn parse_ident_or_constructor(&mut self, depth: usize) -> Result<Value, String> {
        let start = self.pos;
        while let Some(b) = self.peek() {
            if b.is_ascii_alphanumeric() || b == b'_' {
                self.pos += 1;
            } else {
                break;
            }
        }
        let ident = &self.src[start..self.pos];
        self.skip_ws();

        if self.peek() != Some(b'(') {
            return match ident {
                "null" => Ok(Value::Null),
                "true" => Ok(Value::Bool(true)),
                "false" => Ok(Value::Bool(false)),
                other => Ok(Value::String(other.to_string())),
            };
        }

        self.pos += 1; // '('
        let mut args = Vec::new();
        loop {
            self.skip_ws();
            if self.peek() == Some(b')') {
                self.pos += 1;
                break;
            }
            args.push(self.parse_value(depth + 1)?);
            self.skip_ws();
            match self.peek() {
                Some(b',') => self.pos += 1,
                Some(b')') => {
                    self.pos += 1;
                    break;
                }
                _ => return Err(format!("Expected ',' or ')' at position {}", self.pos)),
            }
        }

        if let Some(fields) = self.schemas.get(ident) {
            let mut map = Map::new();
            for (field, val) in fields.iter().zip(args) {
                map.insert((*field).to_string(), val);
            }
            Ok(Value::Object(map))
        } else {
            let mut map = Map::new();
            map.insert("_type".to_string(), Value::String(ident.to_string()));
            map.insert("args".to_string(), Value::Array(args));
            Ok(Value::Object(map))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_champion_analysis_toon_to_json() {
        let sample = "class LolGetChampionAnalysis: champion,position,data\n\
class Data: damage_type,core_items\n\
class CoreItem: ids,ids_names,play,win,pick_rate\n\n\
LolGetChampionAnalysis(\"AHRI\",\"MID\",Data(\"AP\",CoreItem([3118,4645],[\"Malignance\",\"Shadowflame\"],21651,11484,0.14)))";

        let val = parse_toon_or_json(sample).expect("TOON payload should parse");
        assert_eq!(val["champion"], "AHRI");
        assert_eq!(val["position"], "MID");
        assert_eq!(val["data"]["damage_type"], "AP");
        assert_eq!(val["data"]["core_items"]["ids"][0], 3118);
        assert_eq!(val["data"]["core_items"]["ids_names"][1], "Shadowflame");
    }

    #[test]
    fn passes_through_standard_json() {
        let raw = r#"{"my_champion":"Ahri","opponent_champion":"Syndra"}"#;
        let val = parse_toon_or_json(raw).expect("JSON payload should parse");
        assert_eq!(val["my_champion"], "Ahri");
    }
}
