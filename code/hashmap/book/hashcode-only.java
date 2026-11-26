import java.util.Objects;

public class Book {

    private final String isbn;
    private final String title;
    private final String author;

    public Book(String isbn, String title, String author) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
    }

    @Override
    public String toString() {
        return title + " by " + author + " (" + isbn + ")";
    }

    @Override
    public int hashCode() {
        System.out.println("Calling hashCode on " + this); // @hash.print
        int hash = 5; // @hash.init
        hash = 71 * hash + Objects.hashCode(this.isbn); // @hash.isbn
        hash = 71 * hash + Objects.hashCode(this.title); // @hash.title
        hash = 71 * hash + Objects.hashCode(this.author); // @hash.author
        return hash; // @hash.return
    }

    // No equals here: Book inherits it from Object.
}
