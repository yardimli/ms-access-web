import com.healthmarketscience.jackcess.*;
import com.healthmarketscience.jackcess.query.Query;
import com.google.gson.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;

/** Read-only Access inspection/export. Never starts Access or executes VBA/queries. */
public class AccessReader {
    static final Gson JSON = new GsonBuilder().serializeNulls().disableHtmlEscaping().create();
    static Object value(Object input) {
        if (input instanceof byte[]) return Map.of("$binary", Base64.getEncoder().encodeToString((byte[]) input));
        if (input instanceof java.util.Date) return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(input);
        if (input instanceof java.time.temporal.TemporalAccessor) return input.toString();
        if (input == null || input instanceof String || input instanceof Number || input instanceof Boolean) return input;
        return input.toString();
    }
    static Map<String,Object> properties(PropertyMap properties) {
        Map<String,Object> result = new LinkedHashMap<>();
        for (PropertyMap.Property property : properties) result.put(property.getName(), value(property.getValue()));
        return result;
    }
    public static void main(String[] args) throws Exception {
        if (args.length < 2) throw new IllegalArgumentException("Usage: AccessReader file output-directory [selection.json]");
        Path out = Paths.get(args[1]); Files.createDirectories(out);
        JsonObject selection = args.length > 2 ? JsonParser.parseString(Files.readString(Paths.get(args[2]))).getAsJsonObject() : null;
        Set<String> selected = new HashSet<>();
        if (selection != null) for (JsonElement name : selection.getAsJsonArray("tables")) selected.add(name.getAsString());
        List<Object> tables = new ArrayList<>(), queries = new ArrayList<>(), relations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        try (Database db = new DatabaseBuilder(new File(args[0])).setReadOnly(true).open()) {
            int fileNumber = 0;
            for (String name : db.getTableNames()) {
                Map<String,Object> item = new LinkedHashMap<>(); item.put("name", name);
                try {
                    TableMetaData meta = db.getTableMetaData(name);
                    if (meta.isLinked()) {
                        item.put("supported", false); item.put("reason", "Linked table: its external data is not included in this upload."); tables.add(item); continue;
                    }
                    Table table = db.getTable(name);
                    List<Object> columns = new ArrayList<>(), indexes = new ArrayList<>();
                    boolean complex = false;
                    for (Column column : table.getColumns()) {
                        Map<String,Object> col = new LinkedHashMap<>();
                        col.put("name", column.getName()); col.put("type", column.getType().name());
                        col.put("autoNumber", column.isAutoNumber()); col.put("properties", properties(column.getProperties()));
                        columns.add(col);
                        if (column.getType() == DataType.COMPLEX_TYPE) complex = true;
                    }
                    for (Index index : table.getIndexes()) {
                        List<String> names = new ArrayList<>();
                        for (Index.Column column : index.getColumns()) names.add(column.getName());
                        indexes.add(Map.of("name", index.getName(), "primary", index.isPrimaryKey(), "unique", index.isUnique(), "columns", names));
                    }
                    item.put("columns", columns); item.put("indexes", indexes); item.put("rowCount", table.getRowCount());
                    item.put("supported", !complex);
                    if (complex) item.put("reason", "Contains attachment or multivalue fields; this version does not flatten complex Access fields.");
                    String filename = "table-" + fileNumber++ + ".jsonl"; item.put("file", filename);
                    if (selection != null && selected.contains(name) && !complex) {
                        try (BufferedWriter writer = Files.newBufferedWriter(out.resolve(filename), StandardCharsets.UTF_8)) {
                            for (Row row : table) {
                                Map<String,Object> record = new LinkedHashMap<>();
                                for (Column column : table.getColumns()) record.put(column.getName(), value(row.get(column.getName())));
                                writer.write(JSON.toJson(record)); writer.newLine();
                            }
                        }
                    }
                } catch (Exception error) { item.put("supported", false); item.put("reason", error.getMessage()); }
                tables.add(item);
            }
            for (Query query : db.getQueries()) {
                if (query.isHidden()) continue;
                Map<String,Object> item = new LinkedHashMap<>(); item.put("name", query.getName()); item.put("type", query.getType().name());
                try { item.put("sql", query.toSQLString()); item.put("supported", true); }
                catch (Exception error) { item.put("supported", false); item.put("reason", error.getMessage()); }
                queries.add(item);
            }
            for (Relationship relation : db.getRelationships()) {
                List<String> from = new ArrayList<>(), to = new ArrayList<>();
                for (Column column : relation.getFromColumns()) from.add(column.getName());
                for (Column column : relation.getToColumns()) to.add(column.getName());
                relations.add(Map.of("fromTable", relation.getFromTable().getName(), "fromColumns", from,
                    "toTable", relation.getToTable().getName(), "toColumns", to, "enforced", relation.hasReferentialIntegrity()));
            }
        }
        warnings.add("Saved queries are retained as Access SQL definitions; Access-specific SQL may require changes before running on SQLite.");
        warnings.add("Forms, reports, macros and VBA are not converted by this importer.");
        Files.writeString(out.resolve("manifest.json"), JSON.toJson(Map.of("tables", tables, "queries", queries, "relationships", relations, "warnings", warnings)), StandardCharsets.UTF_8);
    }
}
