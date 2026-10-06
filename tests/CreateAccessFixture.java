import com.healthmarketscience.jackcess.*;
import java.io.File;
public class CreateAccessFixture {
    public static void main(String[] args) throws Exception {
        File file = new File(args[0]); if (file.exists()) file.delete();
        try (Database db = DatabaseBuilder.create(Database.FileFormat.V2010, file)) {
            Table people = new TableBuilder("People")
                .addColumn(new ColumnBuilder("ID", DataType.LONG).setAutoNumber(true))
                .addColumn(new ColumnBuilder("Name", DataType.TEXT))
                .setPrimaryKey("ID").toTable(db);
            people.addRow(Column.AUTO_NUMBER, "O'Brien"); people.addRow(Column.AUTO_NUMBER, "Second person");
            new TableBuilder("Omitted").addColumn(new ColumnBuilder("Value", DataType.TEXT)).toTable(db).addRow("Do not import");
        }
    }
}
