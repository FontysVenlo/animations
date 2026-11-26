public class Bicycle extends Vehicle {

    public Bicycle(String brand, String model) {
        super(brand, model);
    }

    @Override
    public void move() { // @move
        System.out.println("Pedal the " + this); // @move.print
    }
}
