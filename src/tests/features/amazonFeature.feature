Feature: Amazon guest shopping
#1
  @search
  Scenario: Guest searches for a product
    Given a new guest opens the Amazon homepage
    When the guest searches for "Snickers"
#2
  @sort
  Scenario: Guest searches for a product and sorts by lowest price
    Given a new guest opens the Amazon homepage
    When the guest searches for "Snickers"
    And sorts the results by price from low to high
#3
  @add
  Scenario Outline: Guest adds the cheapest matching product to the basket
    Given a new guest opens the Amazon homepage
    When the guest adds the cheapest priced matching "<product>" to the basket

    Examples:
      | product  |
      | Snickers |
      | Skittles |
#4
    @twoProducts
  Scenario Outline: Guest adds two products to the same basket
    Given a new guest opens the Amazon homepage
    When the guest adds the cheapest priced matching "<firstProduct>" to the basket
    And the guest adds the cheapest priced matching "<secondProduct>" to the basket

    Examples:
      | firstProduct | secondProduct |
      | Snickers     | Skittles      |

#5
  @twoProducts2
  Scenario Outline: Guest verifies two products and their basket subtotal
    Given a new guest opens the Amazon homepage
    When the guest adds the cheapest priced matching "<firstProduct>" to the basket
    And the guest adds the cheapest priced matching "<secondProduct>" to the basket
    Then the basket should contain the 2 expected products
    And the basket item subtotal should equal the sum of the selected prices

    Examples:
      | firstProduct | secondProduct |
      | Snickers     | Skittles      |

#6
  @twoProducts&checkout
  Scenario Outline: Guest verifies the basket and account requirement at checkout
    Given a new guest opens the Amazon homepage
    When the guest adds the cheapest priced matching "<firstProduct>" to the basket
    And the guest adds the cheapest priced matching "<secondProduct>" to the basket
    Then the basket should contain the 2 expected products
    And the basket item subtotal should equal the sum of the selected prices
    When the guest proceeds to checkout
    Then Amazon should ask the guest to sign in or create an account

    Examples:
      | firstProduct | secondProduct |
      | Snickers     | Skittles      |
