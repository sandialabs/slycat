Feature: Slycat Agent

  Scenario Outline: Parsing valid hyperchunk expressions.
    When parsing a hyperchunk expression, <expression> is valid.

    Examples:
      | expression                            |
      | 0                                     |
      | 0;1                                   |
      | 0/1                                   |
      | 0/1;2/3                               |
      | 0:10                                  |
      | 0:10:2                                |
      | :10:2                                 |
      | 0::2                                  |
      | 0:10/20:30                            |
      | .../20:30                             |
      | 0:10/...                              |
      | 0/1/20                                |
      | 0/1/20:30                             |
      | 0/1/20,30                             |
      | 0/1/20:30,40:50                       |

